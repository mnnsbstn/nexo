import { prisma, ensureDefaultSettings } from "@/lib/db";
import { getModelMode } from "@/server/model/provider";
import { runDemoAgent } from "@/server/agent/demo-agent";
import { runLiveAgent } from "@/server/agent/openai-agent";
import { toUserFacingLiveError } from "@/server/agent/live-errors";

export async function getOrCreateDefaultConversation() {
  await ensureDefaultSettings();
  let conv = await prisma.conversation.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!conv) {
    conv = await prisma.conversation.create({ data: { title: "Hauptchat" } });
  }
  return conv;
}

export async function handleChatMessage(conversationId: string, content: string) {
  const userMsg = await prisma.message.create({
    data: { conversationId, role: "user", content },
  });

  const mode = getModelMode();
  let result: Awaited<ReturnType<typeof runDemoAgent>> & {
    liveFallback?: boolean;
    liveError?: string;
  };
  let effectiveMode: "live" | "demo" = mode;

  try {
    if (mode === "live") {
      result = await runLiveAgent(content, {
        conversationId,
        messageId: userMsg.id,
      });
    } else {
      result = await runDemoAgent(content, {
        conversationId,
        messageId: userMsg.id,
      });
    }
  } catch (err) {
    const liveError = toUserFacingLiveError(
      err instanceof Error ? err.message : "Agent-Fehler",
    );

    if (mode === "live") {
      try {
        const demo = await runDemoAgent(content, {
          conversationId,
          messageId: userMsg.id,
        });
        result = {
          ...demo,
          reply: [
            "**Live-Modus fehlgeschlagen** — automatischer Demo-Fallback (keine echte Live-Ausgabe):",
            "",
            `_Fehler: ${liveError}_`,
            "",
            demo.reply,
          ].join("\n"),
          liveFallback: true,
          liveError,
        };
        effectiveMode = "demo";
      } catch {
        const assistantMsg = await prisma.message.create({
          data: {
            conversationId,
            role: "assistant",
            content: `**Live-Modus fehlgeschlagen**\n\n${liveError}\n\nBitte API-Konfiguration prüfen oder später erneut versuchen.`,
            metadata: JSON.stringify({ error: true, live: true }),
          },
        });
        return { userMsg, assistantMsg, proposals: [], mode: "live", error: liveError };
      }
    } else {
      const assistantMsg = await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: `Fehler bei der Verarbeitung: ${liveError}. Du kannst es erneut versuchen.`,
          metadata: JSON.stringify({ error: true, demo: true }),
        },
      });
      return { userMsg, assistantMsg, proposals: [], mode, error: liveError };
    }
  }

  const assistantMsg = await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: result.reply,
      metadata: JSON.stringify({
        proposalIds: result.proposalIds,
        demo: result.demo ?? effectiveMode === "demo",
        live: effectiveMode === "live" && !result.liveFallback,
        liveFallback: result.liveFallback ?? false,
        liveError: result.liveError,
        liveMeta: result.liveMeta,
      }),
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const proposals =
    result.proposalIds.length > 0
      ? await prisma.actionProposal.findMany({
          where: { id: { in: result.proposalIds } },
        })
      : [];

  return {
    userMsg,
    assistantMsg,
    proposals,
    mode: effectiveMode,
    liveMeta: result.liveMeta,
    liveFallback: result.liveFallback,
  };
}

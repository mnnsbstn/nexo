import { prisma, ensureDefaultSettings } from "@/lib/db";
import { getModelMode } from "@/server/model/provider";
import { runDemoAgent } from "@/server/agent/demo-agent";
import { runLiveAgent } from "@/server/agent/openai-agent";

const MAX_AGENT_STEPS = 3;

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
  let result;
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
    const message =
      err instanceof Error ? err.message : "Agent-Fehler";
    const assistantMsg = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: `Fehler bei der Verarbeitung: ${message}. Du kannst es erneut versuchen.`,
        metadata: JSON.stringify({ error: true }),
      },
    });
    return { userMsg, assistantMsg, proposals: [], mode, error: message };
  }

  const assistantMsg = await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: result.reply,
      metadata: JSON.stringify({
        proposalIds: result.proposalIds,
        demo: result.demo ?? mode === "demo",
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
    mode,
    stepsUsed: MAX_AGENT_STEPS,
  };
}

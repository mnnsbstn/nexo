import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import type { AgentTurnResult } from "@/server/agent/demo-agent";
import {
  LIVE_HISTORY_MESSAGE_LIMIT,
  LIVE_MODEL_MAX_RETRIES,
  MAX_LIVE_TOOL_ROUNDS,
} from "@/server/agent/config";
import { executeAgentTool, openAiToolDefinitions } from "@/server/tools/agent-tools";

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("rate limit") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("econnreset")
  );
}

async function withRetries<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < LIVE_MODEL_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isRetryableError(err) || attempt === LIVE_MODEL_MAX_RETRIES - 1) {
        throw err;
      }
    }
  }
  throw last;
}

async function loadRecentHistory(conversationId: string, excludeMessageId: string) {
  const rows = await prisma.message.findMany({
    where: { conversationId, id: { not: excludeMessageId } },
    orderBy: { createdAt: "desc" },
    take: LIVE_HISTORY_MESSAGE_LIMIT,
  });
  return rows.reverse().map(
    (m): ChatCompletionMessageParam => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 4000),
    }),
  );
}

export async function runLiveAgent(
  userMessage: string,
  ctx: { conversationId: string; messageId: string },
): Promise<AgentTurnResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY fehlt");
  }

  const settings = await getSettings();
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
    timeout: 60_000,
  });

  const system = [
    "Du bist Nexo, ein persönlicher Assistent. Antworte auf Deutsch.",
    "Du hast KEINEN Zugriff auf Kalender, E-Mail oder externe Messenger.",
    "Nutze Tools für Fakten. Erfinde keine Aufgaben oder Erinnerungen.",
    "Schreibende Änderungen NUR über propose_action — nie behaupten, sie seien schon erledigt.",
    "Nach propose_action: weise den Nutzer auf die Bestätigungskarte hin.",
    `Zeitzone: ${settings.timezone}.`,
    `Max. ${MAX_LIVE_TOOL_ROUNDS} Tool-Runden pro Anfrage.`,
  ].join("\n");

  const history = await loadRecentHistory(ctx.conversationId, ctx.messageId);
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: userMessage },
  ];

  const proposalIds: string[] = [];
  let steps = 0;
  let finalReply = "";

  while (steps < MAX_LIVE_TOOL_ROUNDS) {
    steps++;
    const completion = await withRetries(() =>
      client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages,
        tools: openAiToolDefinitions,
        tool_choice: "auto",
      }),
    );

    const choice = completion.choices[0]?.message;
    if (!choice) {
      throw new Error("Leere Modellantwort");
    }

    if (choice.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: choice.content ?? "",
        tool_calls: choice.tool_calls,
      });

      for (const call of choice.tool_calls) {
        if (call.type !== "function") continue;
        const result = await executeAgentTool(call.function.name, call.function.arguments, ctx);
        if (result.proposalId) proposalIds.push(result.proposalId);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.output.slice(0, 8000),
        });
      }
      continue;
    }

    finalReply = (choice.content ?? "").trim();
    break;
  }

  if (!finalReply) {
    if (proposalIds.length) {
      finalReply =
        "Ich habe einen Aktionsvorschlag vorbereitet. Bitte prüfe und bestätige die Karte unten.";
    } else {
      finalReply =
        "Ich konnte die Anfrage nicht abschließend beantworten (Tool-Limit erreicht). Bitte formuliere kürzer oder teile die Frage auf.";
    }
  }

  return {
    reply: `**Live-Antwort**\n\n${finalReply}`,
    proposalIds,
    demo: false,
  };
}

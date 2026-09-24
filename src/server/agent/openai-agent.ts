import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getSettings } from "@/lib/settings";
import { getDailyContext, listTasks, searchMemories } from "@/server/tools/read";
import { proposeAction } from "@/server/actions/propose";
import { actionPayloadSchema } from "@/server/schemas/actions";
import type { AgentTurnResult } from "@/server/agent/demo-agent";

const responseSchema = z.object({
  assistantMessage: z.string(),
  proposedAction: actionPayloadSchema.optional(),
  actionSummary: z.string().optional(),
  affectedData: z.string().optional(),
});

export async function runLiveAgent(
  userMessage: string,
  ctx: { conversationId: string; messageId: string },
): Promise<AgentTurnResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY fehlt");
  }

  const settings = await getSettings();
  const daily = await getDailyContext();
  const openTasks = await listTasks({ status: "open" });
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const system = [
    "Du bist Nexo, ein persönlicher Assistent. Antworte auf Deutsch.",
    "Du hast KEINEN Zugriff auf Kalender, E-Mail oder externe Dienste.",
    "Du darfst nur Vorschläge machen; Schreibaktionen werden über propose_action bestätigt.",
    "Erfinde keine Aufgaben oder Erinnerungen.",
    `Zeitzone: ${settings.timezone}. Heute: ${daily.today}.`,
    `Offene Aufgaben (JSON): ${JSON.stringify(openTasks.slice(0, 30))}`,
  ].join("\n");

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    response_format: zodResponseFormat(responseSchema, "nexo_turn"),
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return { reply: "Keine Modellantwort erhalten.", proposalIds: [], demo: false };
  }

  const parsed = responseSchema.parse(JSON.parse(raw));
  const proposalIds: string[] = [];

  if (parsed.proposedAction && parsed.actionSummary && parsed.affectedData) {
    const validated = actionPayloadSchema.parse(parsed.proposedAction);
    const proposal = await proposeAction({
      conversationId: ctx.conversationId,
      triggerMessageId: ctx.messageId,
      payload: validated,
      summary: parsed.actionSummary,
      affectedData: parsed.affectedData,
      scope: "local",
    });
    proposalIds.push(proposal.id);
  }

  if (/merke|thema|erinnerung/i.test(userMessage) && !parsed.proposedAction) {
    const mem = await searchMemories(userMessage);
    if (mem.length) {
      parsed.assistantMessage += `\n\nRelevante Erinnerungen:\n${mem
        .slice(0, 5)
        .map((m) => `- ${m.content}`)
        .join("\n")}`;
    }
  }

  return {
    reply: parsed.assistantMessage,
    proposalIds,
    demo: false,
  };
}

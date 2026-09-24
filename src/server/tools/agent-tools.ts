import { z } from "zod";
import { listTasks, getTask, searchMemories, getDailyContext } from "@/server/tools/read";
import { proposeAction } from "@/server/actions/propose";
import { actionPayloadSchema } from "@/server/schemas/actions";
import { getSettings } from "@/lib/settings";
import { getCalendarIntegrationStatus } from "@/server/integrations/calendar";

const proposeActionArgsSchema = z.object({
  payload: actionPayloadSchema,
  summary: z.string().min(1).max(500),
  affectedData: z.string().min(1).max(2000),
  scope: z.enum(["local", "external"]).optional(),
});

export type AgentToolContext = {
  conversationId: string;
  messageId: string;
};

export type AgentToolResult = {
  output: string;
  proposalId?: string;
};

export async function executeAgentTool(
  name: string,
  rawArgs: string,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  let args: unknown;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { output: JSON.stringify({ error: "Ungültiges JSON für Tool-Argumente." }) };
  }

  switch (name) {
    case "list_tasks": {
      const schema = z.object({ status: z.enum(["open", "done"]).optional() });
      const parsed = schema.parse(args);
      const tasks = await listTasks(parsed.status ? { status: parsed.status } : undefined);
      return {
        output: JSON.stringify({
          tasks: tasks.slice(0, 40).map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            dueAt: t.dueAt?.toISOString() ?? null,
          })),
        }),
      };
    }
    case "get_task": {
      const schema = z.object({ taskId: z.string().min(1) });
      const { taskId } = schema.parse(args);
      const task = await getTask(taskId);
      if (!task) return { output: JSON.stringify({ error: "Aufgabe nicht gefunden." }) };
      return { output: JSON.stringify({ task }) };
    }
    case "search_memories": {
      const schema = z.object({ query: z.string().default(""), limit: z.number().int().min(1).max(20).optional() });
      const { query, limit } = schema.parse(args);
      const memories = await searchMemories(query, limit ?? 10);
      return {
        output: JSON.stringify({
          memories: memories.map((m) => ({
            id: m.id,
            content: m.content,
            category: m.category,
            source: m.source,
          })),
        }),
      };
    }
    case "get_daily_context": {
      const ctxData = await getDailyContext();
      return {
        output: JSON.stringify({
          timezone: ctxData.timezone,
          today: ctxData.today,
          overdue: ctxData.overdue.map((t) => ({ id: t.id, title: t.title })),
          dueToday: ctxData.dueToday.map((t) => ({ id: t.id, title: t.title })),
          dueSoon: ctxData.dueSoon.map((t) => ({ id: t.id, title: t.title })),
          priorities: ctxData.priorities,
        }),
      };
    }
    case "get_calendar_integration_status": {
      const settings = await getSettings();
      const status = await getCalendarIntegrationStatus(settings);
      return { output: JSON.stringify(status) };
    }
    case "propose_action": {
      const parsed = proposeActionArgsSchema.parse(args);
      if (parsed.payload.actionType === "external_calendar_draft") {
        const settings = await getSettings();
        if (!settings.calendarIntegrationEnabled) {
          return {
            output: JSON.stringify({
              error:
                "Kalender-Entwürfe sind deaktiviert. Nutzer muss sie in Einstellungen aktivieren.",
            }),
          };
        }
      }
      const scope =
        parsed.scope ??
        (parsed.payload.actionType === "external_calendar_draft" ? "external" : "local");
      const proposal = await proposeAction({
        conversationId: ctx.conversationId,
        triggerMessageId: ctx.messageId,
        payload: parsed.payload,
        summary: parsed.summary,
        affectedData: parsed.affectedData,
        scope,
      });
      return {
        output: JSON.stringify({
          proposalId: proposal.id,
          status: proposal.status,
          hint: "Wartet auf Nutzerbestätigung in der UI.",
        }),
        proposalId: proposal.id,
      };
    }
    default:
      return { output: JSON.stringify({ error: `Unbekanntes Tool: ${name}` }) };
  }
}

export const openAiToolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "list_tasks",
      description: "Listet gespeicherte Aufgaben in Nexo (read-only).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "done"] },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_task",
      description: "Liest eine Aufgabe anhand der ID.",
      parameters: {
        type: "object",
        properties: { taskId: { type: "string" } },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_memories",
      description: "Durchsucht aktive persönliche Erinnerungen (read-only).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_daily_context",
      description: "Liefert Heute-Kontext: fällig, überfällig, Prioritätsvorschläge.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_calendar_integration_status",
      description:
        "Status der Kalender-Integration (read-only): aktiviert?, verbunden?, Hinweistext.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "propose_action",
      description:
        "Schlägt eine schreibende Aktion vor (Aufgabe, Erinnerung, Tagesplan, optional external_calendar_draft). Wird erst nach UI-Bestätigung ausgeführt. external_calendar_draft nur mit scope external und wenn Kalender-Entwürfe aktiv.",
      parameters: {
        type: "object",
        properties: {
          payload: { type: "object", description: "ActionPayload mit actionType und data" },
          summary: { type: "string" },
          affectedData: { type: "string" },
          scope: { type: "string", enum: ["local", "external"] },
        },
        required: ["payload", "summary", "affectedData"],
      },
    },
  },
];

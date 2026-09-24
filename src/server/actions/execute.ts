import { prisma } from "@/lib/db";
import {
  actionPayloadSchema,
  proposalStatusSchema,
} from "@/server/schemas/actions";
import { persistDayPlan } from "@/server/daily/day-plan";
import { getSettings } from "@/lib/settings";
import { finalizeCalendarDraft, persistCalendarDraft } from "@/server/integrations/calendar";

const TERMINAL = new Set(["succeeded", "failed", "rejected"]);

export async function rejectProposal(proposalId: string) {
  const proposal = await prisma.actionProposal.findUnique({ where: { id: proposalId } });
  if (!proposal) throw new Error("Aktion nicht gefunden.");
  if (TERMINAL.has(proposal.status)) {
    return proposal;
  }
  return prisma.actionProposal.update({
    where: { id: proposalId },
    data: { status: "rejected" },
  });
}

export async function executeProposal(proposalId: string) {
  const proposal = await prisma.actionProposal.findUnique({ where: { id: proposalId } });
  if (!proposal) throw new Error("Aktion nicht gefunden.");

  if (proposal.status === "succeeded") {
    return { proposal, alreadyDone: true as const };
  }
  if (proposal.status === "rejected") {
    throw new Error("Diese Aktion wurde abgelehnt.");
  }
  if (proposal.status === "executing") {
    throw new Error("Aktion wird bereits ausgeführt.");
  }
  if (proposal.status === "failed") {
    throw new Error("Aktion ist fehlgeschlagen. Bitte erneut vorschlagen lassen.");
  }

  const locked = await prisma.actionProposal.updateMany({
    where: {
      id: proposalId,
      status: { in: ["awaiting_confirmation", "proposed"] },
    },
    data: { status: "executing" },
  });

  if (locked.count === 0) {
    const current = await prisma.actionProposal.findUnique({ where: { id: proposalId } });
    if (current?.status === "succeeded") {
      return { proposal: current, alreadyDone: true as const };
    }
    throw new Error("Aktion konnte nicht gestartet werden (Status geändert).");
  }

  try {
    const parsed = actionPayloadSchema.parse(JSON.parse(proposal.payload));
    const result = await runAction(parsed, proposalId);
    const updated = await prisma.actionProposal.update({
      where: { id: proposalId },
      data: {
        status: "succeeded",
        resultPayload: JSON.stringify(result),
        executedAt: new Date(),
        errorMessage: null,
      },
    });
    proposalStatusSchema.parse(updated.status);
    return { proposal: updated, alreadyDone: false as const, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    await prisma.actionProposal.update({
      where: { id: proposalId },
      data: { status: "failed", errorMessage: message },
    });
    throw err;
  }
}

async function runAction(
  action: ReturnType<typeof actionPayloadSchema.parse>,
  proposalId: string,
): Promise<Record<string, unknown>> {
  switch (action.actionType) {
    case "create_task": {
      const { data } = action;
      const task = await prisma.task.create({
        data: {
          title: data.title,
          description: data.description,
          priority: data.priority ?? null,
          dueDate: data.dueDate ?? null,
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
          status: "open",
        },
      });
      return { taskId: task.id };
    }
    case "update_task": {
      const { data } = action;
      const existing = await prisma.task.findUnique({ where: { id: data.taskId } });
      if (!existing) throw new Error("Aufgabe existiert nicht mehr.");
      const task = await prisma.task.update({
        where: { id: data.taskId },
        data: {
          title: data.title ?? undefined,
          description: data.description === undefined ? undefined : data.description,
          status: data.status ?? undefined,
          priority: data.priority === undefined ? undefined : data.priority,
          dueDate: data.dueDate === undefined ? undefined : data.dueDate,
          dueAt:
            data.dueAt === undefined
              ? undefined
              : data.dueAt
                ? new Date(data.dueAt)
                : null,
        },
      });
      return { taskId: task.id };
    }
    case "delete_task": {
      const { data } = action;
      const existing = await prisma.task.findUnique({ where: { id: data.taskId } });
      if (!existing) throw new Error("Aufgabe existiert nicht mehr.");
      await prisma.task.delete({ where: { id: data.taskId } });
      return { taskId: data.taskId, deleted: true };
    }
    case "create_memory": {
      const { data } = action;
      if (looksLikeSecret(data.content)) {
        throw new Error("Passwörter oder Zugangsdaten werden nicht als Erinnerung gespeichert.");
      }
      const memory = await prisma.memory.create({
        data: {
          content: data.content,
          category: data.category,
          source: "chat_confirmed",
        },
      });
      return { memoryId: memory.id };
    }
    case "update_memory": {
      const { data } = action;
      if (looksLikeSecret(data.content)) {
        throw new Error("Passwörter oder Zugangsdaten werden nicht als Erinnerung gespeichert.");
      }
      const existing = await prisma.memory.findUnique({ where: { id: data.memoryId } });
      if (!existing || !existing.isActive) throw new Error("Erinnerung existiert nicht mehr.");
      const memory = await prisma.memory.update({
        where: { id: data.memoryId },
        data: {
          content: data.content,
          category: data.category ?? existing.category,
        },
      });
      return { memoryId: memory.id };
    }
    case "delete_memory": {
      const { data } = action;
      const existing = await prisma.memory.findUnique({ where: { id: data.memoryId } });
      if (!existing) throw new Error("Erinnerung existiert nicht mehr.");
      await prisma.memory.update({
        where: { id: data.memoryId },
        data: { isActive: false },
      });
      return { memoryId: data.memoryId, deleted: true };
    }
    case "save_day_plan": {
      const { data } = action;
      const plan = await persistDayPlan(data);
      return { dayPlanId: plan.id, planDate: plan.planDate };
    }
    case "external_calendar_draft": {
      const settings = await getSettings();
      if (!settings.calendarIntegrationEnabled) {
        throw new Error(
          "Kalender-Entwürfe sind deaktiviert. Bitte in Einstellungen aktivieren.",
        );
      }
      const { data } = action;
      const draft = await persistCalendarDraft(data, proposalId);
      const exportResult = await finalizeCalendarDraft(draft.id);
      return {
        draftId: draft.id,
        connected: exportResult.connected,
        exported: exportResult.exported,
        externalEventId: exportResult.externalEventId,
        hint: exportResult.message,
      };
    }
    default:
      throw new Error("Unbekannter Aktionstyp.");
  }
}

function looksLikeSecret(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\bpasswort\b/.test(lower) ||
    /\bpassword\b/.test(lower) ||
    /\bapi[_-]?key\b/.test(lower) ||
    /\bsecret\b/.test(lower) ||
    /\bprivate key\b/.test(lower)
  );
}

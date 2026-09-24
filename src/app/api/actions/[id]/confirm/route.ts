import { NextResponse } from "next/server";
import { executeProposal } from "@/server/actions/execute";
import { serializeProposal } from "@/lib/serialize";
import { prisma } from "@/lib/db";
import { actionPayloadSchema } from "@/server/schemas/actions";
import { getSettings } from "@/lib/settings";
import { formatDueDisplay } from "@/lib/dates";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const before = await prisma.actionProposal.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const parsed = actionPayloadSchema.parse(JSON.parse(before.payload));
    const settings = await getSettings();
    const stale = await checkStale(before.actionType, parsed, settings.timezone);
    if (stale) {
      return NextResponse.json(
        { error: stale, requiresReconfirm: true },
        { status: 409 },
      );
    }

    const { proposal, alreadyDone, result } = await executeProposal(id);
    return NextResponse.json({
      proposal: serializeProposal(proposal),
      alreadyDone,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ausführung fehlgeschlagen";
    const failed = await prisma.actionProposal.findUnique({ where: { id } });
    return NextResponse.json(
      {
        error: message,
        proposal: failed ? serializeProposal(failed) : null,
      },
      { status: 400 },
    );
  }
}

async function checkStale(
  actionType: string,
  payload: ReturnType<typeof actionPayloadSchema.parse>,
  timezone: string,
): Promise<string | null> {
  if (payload.actionType === "update_task" || payload.actionType === "delete_task") {
    const task = await prisma.task.findUnique({ where: { id: payload.data.taskId } });
    if (!task) return "Die Aufgabe existiert nicht mehr. Bitte lasse Nexo einen neuen Vorschlag erstellen.";
  }
  if (payload.actionType === "update_memory" || payload.actionType === "delete_memory") {
    const mem = await prisma.memory.findUnique({ where: { id: payload.data.memoryId } });
    if (!mem || !mem.isActive) {
      return "Die Erinnerung existiert nicht mehr. Bitte erneut vorschlagen.";
    }
  }
  if (payload.actionType === "create_task" && payload.data.dueAt) {
    // surface confirmation clarity only — no stale logic
    void formatDueDisplay(payload.data.dueDate, new Date(payload.data.dueAt), timezone);
  }
  if (payload.actionType === "external_calendar_draft") {
    const settings = await getSettings();
    if (!settings.calendarIntegrationEnabled) {
      return "Kalender-Entwürfe sind deaktiviert. Bitte in Einstellungen aktivieren und erneut vorschlagen lassen.";
    }
  }
  return null;
}

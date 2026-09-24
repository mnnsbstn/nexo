import { prisma } from "@/lib/db";
import { getDailyContext } from "@/server/tools/read";
import { formatDueDisplay } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { z } from "zod";

export const dayPlanItemSchema = z.object({
  order: z.number().int().min(1),
  title: z.string().min(1).max(500),
  taskId: z.string().optional(),
  kind: z.enum(["task", "suggestion"]),
  note: z.string().max(500).optional(),
});

export const saveDayPlanPayloadSchema = z.object({
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intro: z.string().max(2000).optional(),
  items: z.array(dayPlanItemSchema).min(1).max(20),
});

export type SaveDayPlanPayload = z.infer<typeof saveDayPlanPayloadSchema>;

export async function buildDayPlanDraft(planDate?: string): Promise<SaveDayPlanPayload> {
  const settings = await getSettings();
  const daily = await getDailyContext();
  const date = planDate ?? daily.today;
  const items: SaveDayPlanPayload["items"] = [];
  let order = 1;

  for (const t of [...daily.overdue, ...daily.dueToday]) {
    items.push({
      order: order++,
      title: t.title,
      taskId: t.id,
      kind: "task",
      note: formatDueDisplay(t.dueDate, t.dueAt, settings.timezone),
    });
    if (items.length >= 8) break;
  }

  for (const p of daily.priorities) {
    if (items.length >= 12) break;
    if (items.some((i) => i.taskId === p.taskId)) continue;
    items.push({
      order: order++,
      title: p.title,
      taskId: p.taskId,
      kind: "suggestion",
      note: p.reason,
    });
  }

  for (const t of daily.noDate.slice(0, 3)) {
    if (items.length >= 15) break;
    if (items.some((i) => i.taskId === t.id)) continue;
    items.push({
      order: order++,
      title: t.title,
      taskId: t.id,
      kind: "suggestion",
      note: "Offen ohne Datum",
    });
  }

  if (items.length === 0) {
    items.push({
      order: 1,
      title: "Kurz Überblick verschaffen: offene Aufgaben prüfen",
      kind: "suggestion",
      note: "Keine datierten Aufgaben vorhanden",
    });
  }

  return {
    planDate: date,
    intro:
      "Vorschlag basierend auf Nexo-Aufgaben — blockiert keine Kalenderzeiten und ändert keine Aufgaben.",
    items,
  };
}

export function formatDayPlanPreview(payload: SaveDayPlanPayload): string {
  const lines = payload.items.map((i) => {
    const tag = i.kind === "suggestion" ? " (Vorschlag)" : "";
    const note = i.note ? ` — ${i.note}` : "";
    return `${i.order}. ${i.title}${tag}${note}`;
  });
  return lines.join("\n");
}

export async function persistDayPlan(payload: SaveDayPlanPayload, source = "chat_confirmed") {
  const parsed = saveDayPlanPayloadSchema.parse(payload);
  await prisma.dayPlan.updateMany({
    where: { planDate: parsed.planDate, isActive: true },
    data: { isActive: false },
  });
  return prisma.dayPlan.create({
    data: {
      planDate: parsed.planDate,
      intro: parsed.intro ?? null,
      items: JSON.stringify(parsed.items),
      source,
      isActive: true,
      confirmedAt: new Date(),
    },
  });
}

export async function getActiveDayPlan(planDate: string) {
  return prisma.dayPlan.findFirst({
    where: { planDate, isActive: true },
    orderBy: { confirmedAt: "desc" },
  });
}

export function parseDayPlanItems(itemsJson: string) {
  return z.array(dayPlanItemSchema).parse(JSON.parse(itemsJson));
}

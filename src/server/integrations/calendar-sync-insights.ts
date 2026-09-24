import { prisma } from "@/lib/db";
import type { ExternalCalendarEvent } from "@/server/integrations/calendar-read";

export type CalendarDraftOverlap = {
  draftId: string;
  draftTitle: string;
  draftStartAt: string;
  externalEventId: string;
  externalTitle: string;
  externalStartAt: string;
  reason: "time_overlap" | "same_title_same_day";
};

function sameDay(a: Date, b: Date, tzOffsetMs = 0): boolean {
  const da = new Date(a.getTime() + tzOffsetMs);
  const db = new Date(b.getTime() + tzOffsetMs);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export async function findCalendarDraftOverlaps(
  events: ExternalCalendarEvent[],
): Promise<CalendarDraftOverlap[]> {
  if (events.length === 0) return [];

  const drafts = await prisma.externalCalendarDraft.findMany({
    where: { status: { in: ["draft", "exported"] } },
    orderBy: { startAt: "asc" },
    take: 50,
  });

  const overlaps: CalendarDraftOverlap[] = [];

  for (const draft of drafts) {
    const draftEnd = draft.endAt ?? new Date(draft.startAt.getTime() + 60 * 60 * 1000);
    for (const ev of events) {
      const evStart = new Date(ev.startAt);
      const evEnd = ev.endAt ? new Date(ev.endAt) : new Date(evStart.getTime() + 60 * 60 * 1000);

      const titleMatch =
        draft.title.trim().toLowerCase() === ev.title.trim().toLowerCase() &&
        sameDay(draft.startAt, evStart);

      const timeMatch = intervalsOverlap(
        draft.startAt,
        draftEnd,
        evStart,
        evEnd,
      );

      if (!titleMatch && !timeMatch) continue;

      overlaps.push({
        draftId: draft.id,
        draftTitle: draft.title,
        draftStartAt: draft.startAt.toISOString(),
        externalEventId: ev.id,
        externalTitle: ev.title,
        externalStartAt: ev.startAt,
        reason: timeMatch ? "time_overlap" : "same_title_same_day",
      });
    }
  }

  return overlaps.slice(0, 15);
}

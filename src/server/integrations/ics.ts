import type { ExternalCalendarDraft } from "@prisma/client";

function formatIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcsForDraft(draft: ExternalCalendarDraft): string {
  const end = draft.endAt ?? new Date(draft.startAt.getTime() + 60 * 60 * 1000);
  const uid = `${draft.id}@nexo.local`;
  const now = formatIcsUtc(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexo//Kalender-Entwurf//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsUtc(draft.startAt)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcs(draft.title)}`,
  ];
  if (draft.description) {
    lines.push(`DESCRIPTION:${escapeIcs(draft.description)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

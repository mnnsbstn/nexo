import { prisma } from "@/lib/db";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";
import type { ExternalCalendarDraft } from "@prisma/client";

export async function createGoogleCalendarEvent(
  draft: ExternalCalendarDraft,
  accessToken: string,
): Promise<string> {
  if (isE2eCalendarMockEnabled()) {
    void accessToken;
    return `e2e-mock-event-${draft.id.slice(0, 8)}`;
  }

  const conn = await prisma.calendarConnection.findUnique({ where: { id: "google" } });
  const calendarId = encodeURIComponent(conn?.calendarId ?? "primary");
  const end = draft.endAt ?? new Date(draft.startAt.getTime() + 60 * 60 * 1000);
  const timeZone = draft.timezone ?? "Europe/Berlin";

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: draft.title,
        description:
          (draft.description ?? "") +
          (draft.description ? "\n\n" : "") +
          "Erstellt via Nexo (Kalender-Entwurf).",
        start: { dateTime: draft.startAt.toISOString(), timeZone },
        end: { dateTime: end.toISOString(), timeZone },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Google Calendar API: keine Event-ID.");
  return data.id;
}

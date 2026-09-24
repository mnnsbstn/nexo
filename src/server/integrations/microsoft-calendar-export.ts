import type { ExternalCalendarDraft } from "@prisma/client";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";

export async function createMicrosoftCalendarEvent(
  draft: ExternalCalendarDraft,
  accessToken: string,
): Promise<string> {
  if (isE2eCalendarMockEnabled()) {
    void accessToken;
    return `e2e-mock-event-${draft.id.slice(0, 8)}`;
  }

  const end = draft.endAt ?? new Date(draft.startAt.getTime() + 60 * 60 * 1000);
  const timeZone = draft.timezone ?? "Europe/Berlin";

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: draft.title,
      body: {
        contentType: "Text",
        content:
          (draft.description ?? "") +
          (draft.description ? "\n\n" : "") +
          "Erstellt via Nexo (Kalender-Entwurf).",
      },
      start: {
        dateTime: draft.startAt.toISOString().replace(/\.\d{3}Z$/, ""),
        timeZone,
      },
      end: {
        dateTime: end.toISOString().replace(/\.\d{3}Z$/, ""),
        timeZone,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Microsoft Graph: keine Event-ID.");
  return data.id;
}

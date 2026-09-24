import { prisma } from "@/lib/db";
import { refreshGoogleAccessToken } from "@/server/integrations/google-oauth";
import type { ExternalCalendarDraft } from "@prisma/client";

async function getValidAccessToken(): Promise<string | null> {
  const conn = await prisma.calendarConnection.findUnique({ where: { id: "default" } });
  if (!conn) return null;

  const now = Date.now();
  const expires = conn.expiresAt?.getTime() ?? 0;
  if (conn.accessToken && expires > now + 60_000) {
    return conn.accessToken;
  }
  if (!conn.refreshToken) return conn.accessToken || null;

  const refreshed = await refreshGoogleAccessToken(conn.refreshToken);
  await prisma.calendarConnection.update({
    where: { id: "default" },
    data: {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    },
  });
  return refreshed.accessToken;
}

export async function createGoogleCalendarEvent(
  draft: ExternalCalendarDraft,
  accessToken: string,
): Promise<string> {
  const conn = await prisma.calendarConnection.findUnique({ where: { id: "default" } });
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

export async function exportDraftToGoogle(draftId: string): Promise<{
  exported: boolean;
  connected: boolean;
  message: string;
  externalEventId?: string;
}> {
  const token = await getValidAccessToken();
  if (!token) {
    return {
      exported: false,
      connected: false,
      message: "Entwurf gespeichert — Google-Kalender ist nicht verbunden.",
    };
  }

  const draft = await prisma.externalCalendarDraft.findUnique({ where: { id: draftId } });
  if (!draft) {
    return { exported: false, connected: true, message: "Entwurf nicht gefunden." };
  }

  try {
    const eventId = await createGoogleCalendarEvent(draft, token);
    await prisma.externalCalendarDraft.update({
      where: { id: draftId },
      data: {
        status: "exported",
        externalEventId: eventId,
        exportedAt: new Date(),
        exportError: null,
      },
    });
    return {
      exported: true,
      connected: true,
      externalEventId: eventId,
      message: "Termin in Google Kalender erstellt.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export fehlgeschlagen";
    await prisma.externalCalendarDraft.update({
      where: { id: draftId },
      data: { status: "export_failed", exportError: message },
    });
    return { exported: false, connected: true, message };
  }
}

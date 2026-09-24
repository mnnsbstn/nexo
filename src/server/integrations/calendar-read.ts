import { prisma } from "@/lib/db";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";
import { getValidCalendarAccessToken } from "@/server/integrations/calendar-token";

export type ExternalCalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  provider: "google" | "microsoft";
};

export type ListExternalCalendarEventsResult = {
  connected: boolean;
  provider: "google" | "microsoft" | null;
  events: ExternalCalendarEvent[];
  message: string;
  readError?: string;
};

function mockEvents(provider: "google" | "microsoft"): ExternalCalendarEvent[] {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return [
    {
      id: "e2e-mock-read-1",
      title: "E2E Mock-Termin",
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay: false,
      provider,
    },
  ];
}

async function listGoogleEvents(
  accessToken: string,
  limit: number,
  daysAhead: number,
): Promise<ExternalCalendarEvent[]> {
  const conn = await prisma.calendarConnection.findUnique({ where: { id: "default" } });
  const calendarId = encodeURIComponent(conn?.calendarId ?? "primary");
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 86_400_000).toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    maxResults: String(limit),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar (lesen): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    items?: {
      id?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];
  };

  return (data.items ?? []).slice(0, limit).map((item) => {
    const allDay = Boolean(item.start?.date && !item.start.dateTime);
    const startAt = item.start?.dateTime ?? item.start?.date ?? new Date().toISOString();
    const endAt = item.end?.dateTime ?? item.end?.date ?? null;
    return {
      id: item.id ?? "unknown",
      title: item.summary ?? "(Ohne Titel)",
      startAt: allDay ? `${startAt}T00:00:00.000Z` : startAt,
      endAt: endAt ? (allDay ? `${endAt}T00:00:00.000Z` : endAt) : null,
      allDay,
      provider: "google" as const,
    };
  });
}

async function listMicrosoftEvents(
  accessToken: string,
  limit: number,
  daysAhead: number,
): Promise<ExternalCalendarEvent[]> {
  const start = new Date().toISOString();
  const end = new Date(Date.now() + daysAhead * 86_400_000).toISOString();
  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    $top: String(limit),
    $orderby: "start/dateTime",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph (lesen): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    value?: {
      id?: string;
      subject?: string;
      isAllDay?: boolean;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    }[];
  };

  return (data.value ?? []).slice(0, limit).map((item) => ({
    id: item.id ?? "unknown",
    title: item.subject ?? "(Ohne Titel)",
    startAt: item.start?.dateTime ? new Date(item.start.dateTime).toISOString() : new Date().toISOString(),
    endAt: item.end?.dateTime ? new Date(item.end.dateTime).toISOString() : null,
    allDay: Boolean(item.isAllDay),
    provider: "microsoft" as const,
  }));
}

export async function listExternalCalendarEvents(options?: {
  limit?: number;
  daysAhead?: number;
}): Promise<ListExternalCalendarEventsResult> {
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 25);
  const daysAhead = Math.min(Math.max(options?.daysAhead ?? 14, 1), 60);

  const auth = await getValidCalendarAccessToken();
  if (!auth) {
    return {
      connected: false,
      provider: null,
      events: [],
      message: "Kein externer Kalender verbunden — nur Nexo-Entwürfe sichtbar.",
    };
  }

  if (isE2eCalendarMockEnabled()) {
    return {
      connected: true,
      provider: auth.provider,
      events: mockEvents(auth.provider),
      message: "Read-only Vorschau (E2E-Mock, kein Live-Abruf).",
    };
  }

  try {
    const events =
      auth.provider === "microsoft"
        ? await listMicrosoftEvents(auth.token, limit, daysAhead)
        : await listGoogleEvents(auth.token, limit, daysAhead);

    return {
      connected: true,
      provider: auth.provider,
      events,
      message:
        events.length > 0
          ? `${events.length} Termin(e) aus ${auth.provider === "microsoft" ? "Outlook" : "Google"} (read-only, kein Sync).`
          : "Keine Termine im gewählten Zeitraum gefunden.",
    };
  } catch (err) {
    const readError = err instanceof Error ? err.message : "Kalender lesen fehlgeschlagen";
    return {
      connected: true,
      provider: auth.provider,
      events: [],
      message: "Externe Termine konnten nicht geladen werden.",
      readError,
    };
  }
}

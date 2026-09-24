import { parseGermanDuePhrase } from "@/lib/dates";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";
import { getSettings } from "@/lib/settings";
import type { CalendarProvider } from "@/server/integrations/calendar-provider";
import { calendarProviderLabel, parseCalendarProvider } from "@/server/integrations/calendar-provider";
import { listCalendarConnections } from "@/server/integrations/calendar-connection";
import { findCalendarDraftOverlaps } from "@/server/integrations/calendar-sync-insights";
import type { CalendarDraftOverlap } from "@/server/integrations/calendar-sync-insights";
import { listCalDavCalendarEvents } from "@/server/integrations/caldav";
import {
  getCalDavCalendarCredentials,
  getICloudCalendarCredentials,
  getValidCalendarAccessToken,
} from "@/server/integrations/calendar-token";
import { listICloudCalendarEvents } from "@/server/integrations/icloud-caldav";

export type ExternalCalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  provider: CalendarProvider;
  recurring?: boolean;
};

export type ListExternalCalendarEventsResult = {
  connected: boolean;
  provider: CalendarProvider | null;
  events: ExternalCalendarEvent[];
  message: string;
  readError?: string;
  syncInsights?: {
    enabled: boolean;
    daysAhead: number;
    recurringEventCount: number;
    draftOverlaps: CalendarDraftOverlap[];
  };
};

function mockEvents(
  provider: CalendarProvider,
  syncInsightsEnabled?: boolean,
  timezone = "Europe/Berlin",
): ExternalCalendarEvent[] {
  const due = parseGermanDuePhrase("morgen um 10 Uhr", timezone);
  const start = due?.dueAt ?? new Date();
  if (!due?.dueAt) {
    start.setHours(10, 0, 0, 0);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return [
    {
      id: "e2e-mock-read-1",
      title: "E2E Mock-Termin",
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay: false,
      provider,
      recurring: syncInsightsEnabled ? true : undefined,
    },
  ];
}

async function listGoogleEvents(
  accessToken: string,
  limit: number,
  daysAhead: number,
  calendarIdRaw?: string,
): Promise<ExternalCalendarEvent[]> {
  const calendarId = encodeURIComponent(calendarIdRaw ?? "primary");
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

async function listEventsForProvider(
  provider: CalendarProvider,
  auth: { token: string },
  conn: { calendarId: string; serverUrl: string | null },
  limit: number,
  daysAhead: number,
): Promise<ExternalCalendarEvent[]> {
  if (provider === "microsoft") {
    return listMicrosoftEvents(auth.token, limit, daysAhead);
  }
  if (provider === "caldav") {
    const caldav = await getCalDavCalendarCredentials();
    if (!caldav?.calendarUrl) {
      throw new Error("CalDAV nicht vollständig verbunden.");
    }
    const rows = await listCalDavCalendarEvents(
      {
        serverUrl: caldav.serverUrl,
        username: caldav.username,
        password: caldav.password,
      },
      caldav.calendarUrl,
      limit,
      daysAhead,
    );
    return rows.map((row) => ({ ...row, provider: "caldav" as const }));
  }
  if (provider === "icloud") {
    const icloud = await getICloudCalendarCredentials();
    if (!icloud?.calendarUrl) {
      throw new Error("iCloud Kalender nicht vollständig verbunden.");
    }
    const rows = await listICloudCalendarEvents(
      { appleId: icloud.appleId, appPassword: icloud.appPassword },
      icloud.calendarUrl,
      limit,
      daysAhead,
    );
    return rows.map((row) => ({ ...row, provider: "icloud" as const }));
  }
  return listGoogleEvents(auth.token, limit, daysAhead, conn.calendarId);
}

export async function listExternalCalendarEvents(options?: {
  limit?: number;
  daysAhead?: number;
}): Promise<ListExternalCalendarEventsResult> {
  const settings = await getSettings();
  const insightsEnabled = settings.calendarSyncInsightsEnabled;
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 25);
  const defaultDays = insightsEnabled ? 60 : 14;
  const maxDays = insightsEnabled ? 90 : 60;
  const daysAhead = Math.min(Math.max(options?.daysAhead ?? defaultDays, 1), maxDays);

  const connections = await listCalendarConnections();
  if (connections.length === 0) {
    return {
      connected: false,
      provider: null,
      events: [],
      message: "Kein externer Kalender verbunden — nur Nexo-Entwürfe sichtbar.",
    };
  }

  const providers = connections.map((c) => parseCalendarProvider(c.provider));

  if (isE2eCalendarMockEnabled()) {
    const events = mockEvents(
      providers[0] ?? "google",
      insightsEnabled,
      settings.timezone,
    );
    const recurringEventCount = events.filter((e) => e.recurring).length;
    const draftOverlaps = insightsEnabled ? await findCalendarDraftOverlaps(events) : [];
    return {
      connected: true,
      provider: providers[0] ?? null,
      events,
      message: "Read-only Vorschau (E2E-Mock, kein Live-Abruf).",
      syncInsights: insightsEnabled
        ? {
            enabled: true,
            daysAhead,
            recurringEventCount,
            draftOverlaps,
          }
        : undefined,
    };
  }

  const merged: ExternalCalendarEvent[] = [];
  const errors: string[] = [];

  for (const conn of connections) {
    const provider = parseCalendarProvider(conn.provider);
    const auth = await getValidCalendarAccessToken(provider);
    if (!auth) continue;
    try {
      const chunk = await listEventsForProvider(provider, auth, conn, limit, daysAhead);
      merged.push(...chunk);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lesen fehlgeschlagen";
      errors.push(`${calendarProviderLabel(provider)}: ${msg}`);
    }
  }

  merged.sort((a, b) => a.startAt.localeCompare(b.startAt));
  const events = merged.slice(0, limit);
  const providerLabel =
    providers.length === 1
      ? calendarProviderLabel(providers[0]!)
      : `${providers.length} Kalender`;

  const recurringEventCount = events.filter((e) => e.recurring).length;
  const draftOverlaps = insightsEnabled ? await findCalendarDraftOverlaps(events) : [];

  return {
    connected: true,
    provider: providers.length === 1 ? providers[0]! : null,
    events,
    message:
      events.length > 0
        ? `${events.length} Termin(e) aus ${providerLabel} (read-only, kein Sync).`
        : errors.length > 0
          ? "Externe Termine konnten nicht geladen werden."
          : "Keine Termine im gewählten Zeitraum gefunden.",
    readError: errors.length > 0 ? errors.join(" · ") : undefined,
    syncInsights: insightsEnabled
      ? {
          enabled: true,
          daysAhead,
          recurringEventCount,
          draftOverlaps,
        }
      : undefined,
  };
}

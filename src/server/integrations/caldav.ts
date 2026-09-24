import type { ExternalCalendarDraft } from "@prisma/client";
import { createDAVClient, fetchCalendarObjects } from "tsdav";
import { buildIcsForDraft } from "@/server/integrations/ics";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";

export type CalDavCredentials = {
  serverUrl: string;
  username: string;
  password: string;
};

function normalizeServerUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("CalDAV-Server-URL muss mit http:// oder https:// beginnen.");
  }
  return trimmed;
}

function formatCalDavTimeRange(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function parseIcsField(ics: string, name: string): string | null {
  const re = new RegExp(`^${name}[^:]*:(.+)$`, "m");
  const match = ics.match(re);
  if (!match?.[1]) return null;
  return match[1].replace(/\\n/g, "\n").replace(/\\,/g, ",").trim();
}

function parseIcsDate(value: string): { iso: string; allDay: boolean } {
  if (/^\d{8}$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    return { iso: `${y}-${m}-${d}T00:00:00.000Z`, allDay: true };
  }
  const normalized = value.endsWith("Z")
    ? value
    : `${value.replace(/^(\d{8}T\d{6})/, (_, p) =>
        `${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}T${p.slice(9, 11)}:${p.slice(11, 13)}:${p.slice(13, 15)}`,
      )}Z`;
  const parsed = new Date(normalized);
  return {
    iso: Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString(),
    allDay: false,
  };
}

export async function createCalDavClient(credentials: CalDavCredentials) {
  const serverUrl = normalizeServerUrl(credentials.serverUrl);
  return createDAVClient({
    serverUrl,
    credentials: { username: credentials.username, password: credentials.password },
    authMethod: "Basic",
  });
}

export async function discoverDefaultCalDavCalendarUrl(
  credentials: CalDavCredentials,
): Promise<string> {
  const serverUrl = normalizeServerUrl(credentials.serverUrl);
  const client = await createCalDavClient(credentials);
  const account = await client.createAccount({
    account: {
      serverUrl,
      accountType: "caldav",
      credentials: {
        username: credentials.username,
        password: credentials.password,
      },
    },
  });
  const calendars = await client.fetchCalendars({ account });
  if (!calendars.length) {
    throw new Error("CalDAV: kein Kalender gefunden.");
  }
  const calendarLabel = (c: (typeof calendars)[number]) =>
    String((c as { displayName?: string }).displayName ?? c.url ?? "");
  const preferred =
    calendars.find((c) => /home|standard|default|calendar/i.test(calendarLabel(c))) ??
    calendars[0];
  if (!preferred?.url) {
    throw new Error("CalDAV: Kalender-URL fehlt.");
  }
  return preferred.url;
}

export async function verifyCalDavAccess(credentials: CalDavCredentials): Promise<string> {
  return discoverDefaultCalDavCalendarUrl(credentials);
}

export async function createCalDavCalendarEvent(
  draft: ExternalCalendarDraft,
  credentials: CalDavCredentials,
  calendarUrl: string,
  mockPrefix = "e2e-mock-caldav",
): Promise<string> {
  if (isE2eCalendarMockEnabled()) {
    return `${mockPrefix}-${draft.id.slice(0, 8)}`;
  }

  const serverUrl = normalizeServerUrl(credentials.serverUrl);
  const client = await createCalDavClient(credentials);
  const account = await client.createAccount({
    account: {
      serverUrl,
      accountType: "caldav",
      credentials: {
        username: credentials.username,
        password: credentials.password,
      },
    },
  });
  const calendars = await client.fetchCalendars({ account });
  const calendar = calendars.find((c) => c.url === calendarUrl) ?? calendars[0];
  if (!calendar?.url) {
    throw new Error("CalDAV: Zielkalender nicht gefunden.");
  }

  const res = await client.createCalendarObject({
    calendar,
    iCalString: buildIcsForDraft(draft),
    filename: `${draft.id}.ics`,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CalDAV (Export): ${text.slice(0, 300) || res.statusText}`);
  }
  return `${draft.id}@nexo.local`;
}

export type CalDavEventRow = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  recurring?: boolean;
};

export async function listCalDavCalendarEvents(
  credentials: CalDavCredentials,
  calendarUrl: string,
  limit: number,
  daysAhead: number,
  mockTitle = "E2E Mock-Termin (CalDAV)",
): Promise<CalDavEventRow[]> {
  if (isE2eCalendarMockEnabled()) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return [
      {
        id: "e2e-mock-caldav-1",
        title: mockTitle,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        allDay: false,
      },
    ];
  }

  const serverUrl = normalizeServerUrl(credentials.serverUrl);
  const client = await createCalDavClient(credentials);
  const account = await client.createAccount({
    account: {
      serverUrl,
      accountType: "caldav",
      credentials: {
        username: credentials.username,
        password: credentials.password,
      },
    },
  });
  const calendars = await client.fetchCalendars({ account });
  const calendar = calendars.find((c) => c.url === calendarUrl) ?? calendars[0];
  if (!calendar) {
    throw new Error("CalDAV: Kalender nicht gefunden.");
  }

  const start = new Date();
  const end = new Date(Date.now() + daysAhead * 86_400_000);
  const objects = await fetchCalendarObjects({
    calendar,
    timeRange: { start: formatCalDavTimeRange(start), end: formatCalDavTimeRange(end) },
    expand: true,
  });

  const events: CalDavEventRow[] = [];
  for (const obj of objects) {
    const raw = typeof obj.data === "string" ? obj.data : "";
    if (!raw.includes("BEGIN:VEVENT")) continue;
    const title = parseIcsField(raw, "SUMMARY") ?? "(Ohne Titel)";
    const dtStart = parseIcsField(raw, "DTSTART");
    if (!dtStart) continue;
    const startParsed = parseIcsDate(dtStart);
    const dtEnd = parseIcsField(raw, "DTEND");
    const endParsed = dtEnd ? parseIcsDate(dtEnd) : null;
    const rrule = parseIcsField(raw, "RRULE");
    events.push({
      id: obj.url ?? obj.etag ?? title + startParsed.iso,
      title,
      startAt: startParsed.iso,
      endAt: endParsed?.iso ?? null,
      allDay: startParsed.allDay,
      recurring: Boolean(rrule),
    });
  }

  events.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return events.slice(0, limit);
}

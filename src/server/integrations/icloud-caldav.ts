import type { ExternalCalendarDraft } from "@prisma/client";
import { createDAVClient, fetchCalendarObjects } from "tsdav";
import { buildIcsForDraft } from "@/server/integrations/ics";
import { ICLOUD_CALDAV_URL } from "@/server/integrations/icloud-constants";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";

export type ICloudCredentials = { appleId: string; appPassword: string };

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

export async function createICloudDavClient(credentials: ICloudCredentials) {
  return createDAVClient({
    serverUrl: ICLOUD_CALDAV_URL,
    credentials: { username: credentials.appleId, password: credentials.appPassword },
    authMethod: "Basic",
  });
}

export async function discoverDefaultICloudCalendarUrl(
  credentials: ICloudCredentials,
): Promise<string> {
  const client = await createICloudDavClient(credentials);
  const account = await client.createAccount({
    account: {
      serverUrl: ICLOUD_CALDAV_URL,
      accountType: "caldav",
      credentials: {
        username: credentials.appleId,
        password: credentials.appPassword,
      },
    },
  });
  const calendars = await client.fetchCalendars({ account });
  if (!calendars.length) {
    throw new Error("iCloud CalDAV: kein Kalender gefunden.");
  }
  const calendarLabel = (c: (typeof calendars)[number]) =>
    String((c as { displayName?: string }).displayName ?? c.url ?? "");
  const preferred =
    calendars.find((c) => /home|standard|default/i.test(calendarLabel(c))) ?? calendars[0];
  if (!preferred?.url) {
    throw new Error("iCloud CalDAV: Kalender-URL fehlt.");
  }
  return preferred.url;
}

export async function verifyICloudCalendarAccess(credentials: ICloudCredentials): Promise<string> {
  return discoverDefaultICloudCalendarUrl(credentials);
}

export async function createICloudCalendarEvent(
  draft: ExternalCalendarDraft,
  credentials: ICloudCredentials,
  calendarUrl: string,
): Promise<string> {
  if (isE2eCalendarMockEnabled()) {
    return `e2e-mock-icloud-${draft.id.slice(0, 8)}`;
  }

  const client = await createICloudDavClient(credentials);
  const account = await client.createAccount({
    account: {
      serverUrl: ICLOUD_CALDAV_URL,
      accountType: "caldav",
      credentials: {
        username: credentials.appleId,
        password: credentials.appPassword,
      },
    },
  });
  const calendars = await client.fetchCalendars({ account });
  const calendar = calendars.find((c) => c.url === calendarUrl) ?? calendars[0];
  if (!calendar?.url) {
    throw new Error("iCloud CalDAV: Zielkalender nicht gefunden.");
  }

  const iCalString = buildIcsForDraft(draft);
  const filename = `${draft.id}.ics`;
  const res = await client.createCalendarObject({
    calendar,
    iCalString,
    filename,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`iCloud CalDAV (Export): ${text.slice(0, 300) || res.statusText}`);
  }
  return `${draft.id}@nexo.local`;
}

export type ICloudCalendarEventRow = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
};

export async function listICloudCalendarEvents(
  credentials: ICloudCredentials,
  calendarUrl: string,
  limit: number,
  daysAhead: number,
): Promise<ICloudCalendarEventRow[]> {
  if (isE2eCalendarMockEnabled()) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return [
      {
        id: "e2e-mock-icloud-1",
        title: "E2E Mock-Termin (iCloud)",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        allDay: false,
      },
    ];
  }

  const client = await createICloudDavClient(credentials);
  const account = await client.createAccount({
    account: {
      serverUrl: ICLOUD_CALDAV_URL,
      accountType: "caldav",
      credentials: {
        username: credentials.appleId,
        password: credentials.appPassword,
      },
    },
  });
  const calendars = await client.fetchCalendars({ account });
  const calendar = calendars.find((c) => c.url === calendarUrl) ?? calendars[0];
  if (!calendar) {
    throw new Error("iCloud CalDAV: Kalender nicht gefunden.");
  }

  const start = new Date();
  const end = new Date(Date.now() + daysAhead * 86_400_000);
  const objects = await fetchCalendarObjects({
    calendar,
    timeRange: { start: formatCalDavTimeRange(start), end: formatCalDavTimeRange(end) },
    expand: true,
  });

  const events: ICloudCalendarEventRow[] = [];
  for (const obj of objects) {
    const raw = typeof obj.data === "string" ? obj.data : "";
    if (!raw.includes("BEGIN:VEVENT")) continue;
    const title = parseIcsField(raw, "SUMMARY") ?? "(Ohne Titel)";
    const dtStart = parseIcsField(raw, "DTSTART");
    if (!dtStart) continue;
    const startParsed = parseIcsDate(dtStart);
    const dtEnd = parseIcsField(raw, "DTEND");
    const endParsed = dtEnd ? parseIcsDate(dtEnd) : null;
    events.push({
      id: obj.url ?? obj.etag ?? title + startParsed.iso,
      title,
      startAt: startParsed.iso,
      endAt: endParsed?.iso ?? null,
      allDay: startParsed.allDay,
    });
  }

  events.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return events.slice(0, limit);
}

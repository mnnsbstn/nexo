import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  addDays,
  startOfDay,
  endOfDay,
  isBefore,
  parseISO,
  isValid,
} from "date-fns";
import { de } from "date-fns/locale";

const DEFAULT_TZ = "Europe/Berlin";

export function getTimezone(tz?: string): string {
  return tz && tz.length > 0 ? tz : DEFAULT_TZ;
}

export function nowInTimezone(timezone: string): Date {
  return toZonedTime(new Date(), getTimezone(timezone));
}

export function todayDateKey(timezone: string, at: Date = new Date()): string {
  return formatInTimeZone(at, getTimezone(timezone), "yyyy-MM-dd");
}

export function formatDateTimeForUser(
  value: Date | string,
  timezone: string,
  opts?: { dateOnly?: boolean },
): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "—";
  const pattern = opts?.dateOnly ? "EEEE, d. MMMM yyyy" : "EEEE, d. MMMM yyyy, HH:mm";
  return formatInTimeZone(date, getTimezone(timezone), pattern, { locale: de });
}

export function formatDueDisplay(
  dueDate: string | null | undefined,
  dueAt: Date | null | undefined,
  timezone: string,
): string {
  if (dueAt) {
    return formatDateTimeForUser(dueAt, timezone);
  }
  if (dueDate) {
    const parsed = parseISO(`${dueDate}T12:00:00`);
    return formatDateTimeForUser(parsed, timezone, { dateOnly: true });
  }
  return "Kein Datum";
}

/** Parse German-relative phrases for MVP (demo + fallback). */
export function parseGermanDuePhrase(
  text: string,
  timezone: string,
  reference: Date = new Date(),
): { dueDate?: string; dueAt?: Date; label: string } | null {
  const lower = text.toLowerCase();
  const tz = getTimezone(timezone);
  const zonedRef = toZonedTime(reference, tz);

  let targetDay = zonedRef;
  if (/\bmorgen\b/.test(lower)) {
    targetDay = addDays(zonedRef, 1);
  } else if (/\bheute\b/.test(lower)) {
    targetDay = zonedRef;
  } else {
    return null;
  }

  const dueDate = formatInTimeZone(targetDay, tz, "yyyy-MM-dd");
  const timeMatch = lower.match(/(?:um|gegen)\s*(\d{1,2})(?::(\d{2}))?\s*(?:uhr)?/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    const localIso = `${dueDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
    const dueAt = fromZonedTime(localIso, tz);
    return {
      dueDate,
      dueAt,
      label: formatDateTimeForUser(dueAt, timezone),
    };
  }

  return {
    dueDate,
    label: formatDateTimeForUser(parseISO(`${dueDate}T12:00:00`), timezone, {
      dateOnly: true,
    }),
  };
}

export function isOverdue(
  dueDate: string | null | undefined,
  dueAt: Date | null | undefined,
  timezone: string,
  now: Date = new Date(),
): boolean {
  if (dueAt) {
    return isBefore(dueAt, now);
  }
  if (dueDate) {
    const end = fromZonedTime(`${dueDate}T23:59:59`, getTimezone(timezone));
    return isBefore(end, now);
  }
  return false;
}

export function isDueToday(
  dueDate: string | null | undefined,
  dueAt: Date | null | undefined,
  timezone: string,
  now: Date = new Date(),
): boolean {
  const key = todayDateKey(timezone, now);
  if (dueDate === key) return true;
  if (dueAt) {
    return todayDateKey(timezone, dueAt) === key;
  }
  return false;
}

export function taskDueDateKey(
  dueDate: string | null | undefined,
  dueAt: Date | null | undefined,
  timezone: string,
): string | null {
  if (dueDate) return dueDate;
  if (dueAt) return todayDateKey(timezone, dueAt);
  return null;
}

/** Open tasks due after today within the next `withinDays` calendar days (timezone-aware). */
export function isDueSoon(
  dueDate: string | null | undefined,
  dueAt: Date | null | undefined,
  timezone: string,
  withinDays = 7,
  now: Date = new Date(),
): boolean {
  const key = taskDueDateKey(dueDate, dueAt, timezone);
  if (!key) return false;
  if (isDueToday(dueDate, dueAt, timezone, now)) return false;
  if (isOverdue(dueDate, dueAt, timezone, now)) return false;
  const today = todayDateKey(timezone, now);
  const zoned = toZonedTime(now, getTimezone(timezone));
  const horizon = formatInTimeZone(addDays(zoned, withinDays), getTimezone(timezone), "yyyy-MM-dd");
  return key > today && key <= horizon;
}

export function dayBoundsUtc(timezone: string, dayKey: string): { start: Date; end: Date } {
  const start = fromZonedTime(`${dayKey}T00:00:00`, getTimezone(timezone));
  const end = fromZonedTime(`${dayKey}T23:59:59.999`, getTimezone(timezone));
  return { start, end: endOfDay(toZonedTime(end, getTimezone(timezone))) };
}

export { startOfDay, endOfDay };

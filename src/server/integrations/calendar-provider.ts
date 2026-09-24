export type CalendarProvider = "google" | "microsoft" | "icloud" | "caldav";

export function parseCalendarProvider(value: string | null | undefined): CalendarProvider {
  if (value === "microsoft") return "microsoft";
  if (value === "icloud") return "icloud";
  if (value === "caldav") return "caldav";
  return "google";
}

export function calendarProviderLabel(provider: CalendarProvider | null): string {
  if (provider === "microsoft") return "Outlook";
  if (provider === "icloud") return "iCloud";
  if (provider === "caldav") return "CalDAV";
  return "Google";
}

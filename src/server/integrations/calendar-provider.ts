export type CalendarProvider = "google" | "microsoft" | "icloud";

export function parseCalendarProvider(value: string | null | undefined): CalendarProvider {
  if (value === "microsoft") return "microsoft";
  if (value === "icloud") return "icloud";
  return "google";
}

export function calendarProviderLabel(provider: CalendarProvider | null): string {
  if (provider === "microsoft") return "Outlook";
  if (provider === "icloud") return "iCloud";
  return "Google";
}

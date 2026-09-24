import type { AppSettings } from "@/lib/settings";
import type { CalendarProvider } from "@/server/integrations/calendar-provider";
import { parseCalendarProvider } from "@/server/integrations/calendar-provider";
import { listCalendarConnections } from "@/server/integrations/calendar-connection";

const EXPORT_PRIORITY: CalendarProvider[] = ["google", "microsoft", "icloud", "caldav"];

export async function resolveCalendarExportProvider(
  settings: AppSettings,
): Promise<CalendarProvider | null> {
  const connections = await listCalendarConnections();
  if (connections.length === 0) return null;

  const preferred = settings.calendarExportProvider;
  if (
    preferred &&
    connections.some((c) => parseCalendarProvider(c.provider) === preferred)
  ) {
    return preferred;
  }

  for (const provider of EXPORT_PRIORITY) {
    if (connections.some((c) => parseCalendarProvider(c.provider) === provider)) {
      return provider;
    }
  }

  return parseCalendarProvider(connections[0]!.provider);
}

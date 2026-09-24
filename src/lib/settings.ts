import { prisma, ensureDefaultSettings } from "@/lib/db";
import type { CalendarProvider } from "@/server/integrations/calendar-provider";
import { parseCalendarProvider } from "@/server/integrations/calendar-provider";

export type AppSettings = {
  uiLanguage: string;
  responseLanguage: string;
  timezone: string;
  notifyInAppDueTasks: boolean;
  notifyBrowserDueTasks: boolean;
  calendarIntegrationEnabled: boolean;
  calendarExportProvider: CalendarProvider | null;
  emailIntegrationEnabled: boolean;
};

export async function getSettings(): Promise<AppSettings> {
  await ensureDefaultSettings();
  const s = await prisma.userSettings.findUniqueOrThrow({ where: { id: "default" } });
  return {
    uiLanguage: s.uiLanguage,
    responseLanguage: s.responseLanguage,
    timezone: s.timezone,
    notifyInAppDueTasks: s.notifyInAppDueTasks,
    notifyBrowserDueTasks: s.notifyBrowserDueTasks,
    calendarIntegrationEnabled: s.calendarIntegrationEnabled,
    calendarExportProvider: s.calendarExportProvider
      ? parseCalendarProvider(s.calendarExportProvider)
      : null,
    emailIntegrationEnabled: s.emailIntegrationEnabled,
  };
}

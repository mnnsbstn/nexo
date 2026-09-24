import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import type { CalendarProvider } from "@/server/integrations/calendar-provider";
import { resolveCalendarExportProvider } from "@/server/integrations/calendar-export-target";
import { createCalDavCalendarEvent } from "@/server/integrations/caldav";
import {
  getCalDavCalendarCredentials,
  getICloudCalendarCredentials,
  getValidCalendarAccessToken,
} from "@/server/integrations/calendar-token";
import { createGoogleCalendarEvent } from "@/server/integrations/google-calendar-event";
import { createICloudCalendarEvent } from "@/server/integrations/icloud-caldav";
import { createMicrosoftCalendarEvent } from "@/server/integrations/microsoft-calendar-export";

export type CalendarExportResult = {
  exported: boolean;
  connected: boolean;
  message: string;
  externalEventId?: string;
  exportProvider?: CalendarProvider;
};

export async function exportDraftToExternalCalendar(
  draftId: string,
): Promise<CalendarExportResult> {
  const settings = await getSettings();
  const exportProvider = await resolveCalendarExportProvider(settings);
  const auth = exportProvider ? await getValidCalendarAccessToken(exportProvider) : null;

  if (!exportProvider || !auth) {
    return {
      exported: false,
      connected: false,
      message:
        "Entwurf gespeichert — kein Kalender verbunden. .ics-Download in Einstellungen möglich.",
    };
  }

  const draft = await prisma.externalCalendarDraft.findUnique({ where: { id: draftId } });
  if (!draft) {
    return { exported: false, connected: true, message: "Entwurf nicht gefunden." };
  }

  const provider = exportProvider;

  try {
    let eventId: string;
    if (provider === "microsoft") {
      eventId = await createMicrosoftCalendarEvent(draft, auth.token);
    } else if (provider === "icloud") {
      const icloud = await getICloudCalendarCredentials();
      if (!icloud?.calendarUrl) {
        throw new Error("iCloud Kalender nicht vollständig verbunden.");
      }
      eventId = await createICloudCalendarEvent(draft, icloud, icloud.calendarUrl);
    } else if (provider === "caldav") {
      const caldav = await getCalDavCalendarCredentials();
      if (!caldav?.calendarUrl) {
        throw new Error("CalDAV nicht vollständig verbunden.");
      }
      eventId = await createCalDavCalendarEvent(
        draft,
        {
          serverUrl: caldav.serverUrl,
          username: caldav.username,
          password: caldav.password,
        },
        caldav.calendarUrl,
      );
    } else {
      eventId = await createGoogleCalendarEvent(draft, auth.token);
    }

    await prisma.externalCalendarDraft.update({
      where: { id: draftId },
      data: {
        status: "exported",
        externalEventId: eventId,
        exportProvider: provider,
        exportedAt: new Date(),
        exportError: null,
      },
    });

    return {
      exported: true,
      connected: true,
      externalEventId: eventId,
      exportProvider: provider,
      message:
        provider === "microsoft"
          ? "Termin in Outlook-Kalender erstellt."
          : provider === "icloud"
            ? "Termin in iCloud-Kalender erstellt."
            : provider === "caldav"
              ? "Termin im CalDAV-Kalender erstellt."
              : "Termin in Google Kalender erstellt.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export fehlgeschlagen";
    await prisma.externalCalendarDraft.updateMany({
      where: { id: draftId },
      data: { status: "export_failed", exportError: message },
    });
    return { exported: false, connected: true, message };
  }
}

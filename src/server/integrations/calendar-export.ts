import { prisma } from "@/lib/db";
import { getCalendarConnection } from "@/server/integrations/calendar-connection";
import { getValidCalendarAccessToken } from "@/server/integrations/calendar-token";
import { createGoogleCalendarEvent } from "@/server/integrations/google-calendar-event";
import { createMicrosoftCalendarEvent } from "@/server/integrations/microsoft-calendar-export";

export type CalendarExportResult = {
  exported: boolean;
  connected: boolean;
  message: string;
  externalEventId?: string;
  exportProvider?: "google" | "microsoft";
};

export async function exportDraftToExternalCalendar(
  draftId: string,
): Promise<CalendarExportResult> {
  const connection = await getCalendarConnection();
  const auth = await getValidCalendarAccessToken();

  if (!connection || !auth) {
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

  const provider = auth.provider;

  try {
    const eventId =
      provider === "microsoft"
        ? await createMicrosoftCalendarEvent(draft, auth.token)
        : await createGoogleCalendarEvent(draft, auth.token);

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
          : "Termin in Google Kalender erstellt.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export fehlgeschlagen";
    await prisma.externalCalendarDraft.update({
      where: { id: draftId },
      data: { status: "export_failed", exportError: message },
    });
    return { exported: false, connected: true, message };
  }
}

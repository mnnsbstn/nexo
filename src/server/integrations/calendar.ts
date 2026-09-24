import { prisma } from "@/lib/db";
import type { AppSettings } from "@/lib/settings";
import type { externalCalendarDraftPayloadSchema } from "@/server/schemas/actions";
import type { z } from "zod";
import { isGoogleCalendarOAuthConfigured } from "@/server/integrations/google-config";
import { getCalendarConnection } from "@/server/integrations/calendar-connection";
import { exportDraftToGoogle } from "@/server/integrations/google-calendar-export";

export type CalendarDraftInput = z.infer<typeof externalCalendarDraftPayloadSchema>;

export async function getCalendarIntegrationStatus(settings: AppSettings) {
  const oauthConfigured = isGoogleCalendarOAuthConfigured();
  const connection = await getCalendarConnection();
  const connected = Boolean(oauthConfigured && connection);

  let message: string;
  if (!settings.calendarIntegrationEnabled) {
    message =
      "Kalender-Integration ist aus. In Einstellungen aktivieren, um Entwürfe per Freigabe zu speichern.";
  } else if (!oauthConfigured) {
    message =
      "Entwürfe aktiv — setze GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET und NEXO_PUBLIC_URL für Google OAuth.";
  } else if (!connected) {
    message = "Google OAuth bereit — in Einstellungen „Mit Google verbinden“.";
  } else {
    message = `Verbunden mit Google${connection?.accountEmail ? ` (${connection.accountEmail})` : ""}. Bestätigte Entwürfe werden exportiert.`;
  }

  return {
    enabled: settings.calendarIntegrationEnabled,
    oauthConfigured,
    connected,
    provider: connected ? ("google" as const) : null,
    accountEmail: connection?.accountEmail ?? null,
    message,
  };
}

export async function listCalendarDrafts(limit = 20) {
  return prisma.externalCalendarDraft.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function persistCalendarDraft(
  data: CalendarDraftInput,
  proposalId: string,
) {
  return prisma.externalCalendarDraft.create({
    data: {
      title: data.title,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      description: data.description ?? null,
      timezone: data.timezone ?? null,
      status: "draft",
      proposalId,
    },
  });
}

export async function finalizeCalendarDraft(draftId: string) {
  return exportDraftToGoogle(draftId);
}

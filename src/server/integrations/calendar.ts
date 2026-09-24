import { prisma } from "@/lib/db";
import type { AppSettings } from "@/lib/settings";
import type { externalCalendarDraftPayloadSchema } from "@/server/schemas/actions";
import type { z } from "zod";
import { isGoogleCalendarOAuthConfigured } from "@/server/integrations/google-config";
import { isMicrosoftCalendarOAuthConfigured } from "@/server/integrations/microsoft-config";
import { getCalendarConnection } from "@/server/integrations/calendar-connection";
import { exportDraftToExternalCalendar } from "@/server/integrations/calendar-export";

export type CalendarDraftInput = z.infer<typeof externalCalendarDraftPayloadSchema>;

export async function getCalendarIntegrationStatus(settings: AppSettings) {
  const googleOAuthConfigured = isGoogleCalendarOAuthConfigured();
  const microsoftOAuthConfigured = isMicrosoftCalendarOAuthConfigured();
  const oauthConfigured = googleOAuthConfigured || microsoftOAuthConfigured;
  const connection = await getCalendarConnection();
  const connected = Boolean(oauthConfigured && connection);

  const provider =
    connected && connection?.provider === "microsoft"
      ? ("microsoft" as const)
      : connected
        ? ("google" as const)
        : null;

  let message: string;
  if (!settings.calendarIntegrationEnabled) {
    message =
      "Kalender-Integration ist aus. In Einstellungen aktivieren, um Entwürfe per Freigabe zu speichern.";
  } else if (!oauthConfigured) {
    message =
      "Entwürfe aktiv — setze Google- oder Microsoft-OAuth-Env (Client ID/Secret) und NEXO_PUBLIC_URL.";
  } else if (!connected) {
    const parts: string[] = [];
    if (googleOAuthConfigured) parts.push("Google");
    if (microsoftOAuthConfigured) parts.push("Microsoft");
    message = `OAuth bereit (${parts.join(" / ")}) — in Einstellungen verbinden.`;
  } else if (provider === "microsoft") {
    message = `Verbunden mit Microsoft${connection?.accountEmail ? ` (${connection.accountEmail})` : ""}. Bestätigte Entwürfe werden nach Outlook exportiert.`;
  } else {
    message = `Verbunden mit Google${connection?.accountEmail ? ` (${connection.accountEmail})` : ""}. Bestätigte Entwürfe werden exportiert.`;
  }

  return {
    enabled: settings.calendarIntegrationEnabled,
    oauthConfigured,
    googleOAuthConfigured,
    microsoftOAuthConfigured,
    connected,
    canReadExternal: connected,
    provider,
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
  return exportDraftToExternalCalendar(draftId);
}

import { prisma } from "@/lib/db";
import type { AppSettings } from "@/lib/settings";
import type { externalCalendarDraftPayloadSchema } from "@/server/schemas/actions";
import type { z } from "zod";
import {
  calendarProviderLabel,
  parseCalendarProvider,
} from "@/server/integrations/calendar-provider";
import { getEmailConnection } from "@/server/integrations/email-connection";
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
  const provider = connection ? parseCalendarProvider(connection.provider) : null;
  const icloudConnected = provider === "icloud";
  const oauthConnected = Boolean(
    connection && (provider === "google" || provider === "microsoft") && oauthConfigured,
  );
  const connected = icloudConnected || oauthConnected;

  let message: string;
  if (!settings.calendarIntegrationEnabled) {
    message =
      "Kalender-Integration ist aus. In Einstellungen aktivieren, um Entwürfe per Freigabe zu speichern.";
  } else if (!connected && !oauthConfigured) {
    message =
      "Entwürfe aktiv — Google/Microsoft-OAuth in .env oder iCloud (Apple-ID + App-Passwort) in Einstellungen.";
  } else if (!connected) {
    const parts: string[] = ["iCloud"];
    if (googleOAuthConfigured) parts.push("Google");
    if (microsoftOAuthConfigured) parts.push("Microsoft");
    message = `Verbindung möglich (${parts.join(" / ")}) — in Einstellungen verbinden.`;
  } else if (provider) {
    message = `Verbunden mit ${calendarProviderLabel(provider)}${connection?.accountEmail ? ` (${connection.accountEmail})` : ""}. Bestätigte Entwürfe werden exportiert.`;
  } else {
    message = "Kalender verbunden.";
  }

  const emailConn = await getEmailConnection();
  const icloudMailConnected = emailConn?.provider === "icloud";

  return {
    enabled: settings.calendarIntegrationEnabled,
    oauthConfigured,
    googleOAuthConfigured,
    microsoftOAuthConfigured,
    icloudAvailable: true,
    icloudConnected,
    icloudMailConnected,
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

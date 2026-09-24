import { prisma } from "@/lib/db";
import type { AppSettings } from "@/lib/settings";
import type { externalCalendarDraftPayloadSchema } from "@/server/schemas/actions";
import type { z } from "zod";
import {
  calendarProviderLabel,
  parseCalendarProvider,
} from "@/server/integrations/calendar-provider";
import { resolveCalendarExportProvider } from "@/server/integrations/calendar-export-target";
import { getEmailConnection } from "@/server/integrations/email-connection";
import { isGoogleCalendarOAuthConfigured } from "@/server/integrations/google-config";
import { isMicrosoftCalendarOAuthConfigured } from "@/server/integrations/microsoft-config";
import { listCalendarConnections } from "@/server/integrations/calendar-connection";
import { exportDraftToExternalCalendar } from "@/server/integrations/calendar-export";

export type CalendarDraftInput = z.infer<typeof externalCalendarDraftPayloadSchema>;

export async function getCalendarIntegrationStatus(settings: AppSettings) {
  const googleOAuthConfigured = isGoogleCalendarOAuthConfigured();
  const microsoftOAuthConfigured = isMicrosoftCalendarOAuthConfigured();
  const oauthConfigured = googleOAuthConfigured || microsoftOAuthConfigured;
  const connections = await listCalendarConnections();
  const connectedProviders = connections.map((c) => parseCalendarProvider(c.provider));
  const connected = connectedProviders.length > 0;

  const googleConnected = connectedProviders.includes("google");
  const microsoftConnected = connectedProviders.includes("microsoft");
  const icloudConnected = connectedProviders.includes("icloud");

  const exportProvider = connected
    ? await resolveCalendarExportProvider(settings)
    : null;

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
    message = `Verbindung möglich (${parts.join(" / ")}) — mehrere Provider parallel möglich.`;
  } else if (connectedProviders.length === 1 && exportProvider) {
    const conn = connections[0];
    message = `Verbunden mit ${calendarProviderLabel(exportProvider)}${conn?.accountEmail ? ` (${conn.accountEmail})` : ""}. Export dorthin nach Bestätigung.`;
  } else if (exportProvider) {
    message = `${connectedProviders.length} Kalender verbunden — Export-Ziel: ${calendarProviderLabel(exportProvider)} (in Einstellungen änderbar).`;
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
    googleConnected,
    microsoftConnected,
    icloudConnected,
    icloudMailConnected,
    connected,
    canReadExternal: connected,
    connections: connections.map((c) => ({
      provider: parseCalendarProvider(c.provider),
      accountEmail: c.accountEmail ?? null,
    })),
    exportProvider,
    provider: exportProvider,
    accountEmail:
      connections.find((c) => parseCalendarProvider(c.provider) === exportProvider)
        ?.accountEmail ?? null,
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

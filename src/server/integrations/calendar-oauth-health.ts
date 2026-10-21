import type { CalendarProvider } from "@/server/integrations/calendar-provider";
import { calendarProviderLabel } from "@/server/integrations/calendar-provider";
import {
  decryptConnectionTokens,
  getCalendarConnection,
  updateCalendarAccessToken,
} from "@/server/integrations/calendar-connection";
import { refreshGoogleAccessToken } from "@/server/integrations/google-oauth";
import { refreshMicrosoftAccessToken } from "@/server/integrations/microsoft-oauth";

export type CalendarOAuthHealthStatus = "ok" | "reconnect_required" | "refresh_failed";

export type CalendarOAuthHealthEntry = {
  provider: "google" | "microsoft";
  status: CalendarOAuthHealthStatus;
  message?: string;
};

const OAUTH_PROVIDERS = ["google", "microsoft"] as const;

function isExpired(expiresAt: Date | null, accessToken: string | null): boolean {
  if (!accessToken) return true;
  const expires = expiresAt?.getTime() ?? 0;
  return expires <= Date.now() + 60_000;
}

export async function getCalendarOAuthHealth(): Promise<CalendarOAuthHealthEntry[]> {
  const entries: CalendarOAuthHealthEntry[] = [];

  for (const provider of OAUTH_PROVIDERS) {
    const conn = await getCalendarConnection(provider);
    if (!conn) continue;

    const { accessToken, refreshToken } = decryptConnectionTokens(conn);
    if (!isExpired(conn.expiresAt, accessToken)) {
      entries.push({ provider, status: "ok" });
      continue;
    }

    if (!refreshToken) {
      entries.push({
        provider,
        status: "reconnect_required",
        message: `${calendarProviderLabel(provider)}: Sitzung abgelaufen — bitte erneut verbinden.`,
      });
      continue;
    }

    try {
      const refreshed =
        provider === "microsoft"
          ? await refreshMicrosoftAccessToken(refreshToken)
          : await refreshGoogleAccessToken(refreshToken);
      await updateCalendarAccessToken(
        provider as CalendarProvider,
        refreshed.accessToken,
        refreshed.expiresAt,
      );
      entries.push({ provider, status: "ok" });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unbekannter Fehler";
      entries.push({
        provider,
        status: "refresh_failed",
        message: `${calendarProviderLabel(provider)}: Token-Refresh fehlgeschlagen — erneut verbinden. (${detail.slice(0, 120)})`,
      });
    }
  }

  return entries;
}

export function oauthReconnectHint(provider: CalendarProvider): string | null {
  if (provider !== "google" && provider !== "microsoft") return null;
  return `${calendarProviderLabel(provider)}: Anmeldung ungültig — in Einstellungen erneut verbinden.`;
}

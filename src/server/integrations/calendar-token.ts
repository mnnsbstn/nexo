import type { CalendarProvider } from "@/server/integrations/calendar-provider";
import { parseCalendarProvider } from "@/server/integrations/calendar-provider";
import {
  decryptConnectionTokens,
  getCalendarConnection,
  updateCalendarAccessToken,
} from "@/server/integrations/calendar-connection";
import { refreshGoogleAccessToken } from "@/server/integrations/google-oauth";
import { refreshMicrosoftAccessToken } from "@/server/integrations/microsoft-oauth";

export async function getValidCalendarAccessToken(provider: CalendarProvider): Promise<{
  token: string;
  provider: CalendarProvider;
  accountEmail: string | null;
} | null> {
  const conn = await getCalendarConnection(provider);
  if (!conn) return null;

  const parsed = parseCalendarProvider(conn.provider);
  const { accessToken, refreshToken } = decryptConnectionTokens(conn);

  if (parsed === "icloud" || parsed === "caldav") {
    return accessToken
      ? { token: accessToken, provider: parsed, accountEmail: conn.accountEmail ?? null }
      : null;
  }

  const now = Date.now();
  const expires = conn.expiresAt?.getTime() ?? 0;
  if (accessToken && expires > now + 60_000) {
    return { token: accessToken, provider: parsed, accountEmail: conn.accountEmail ?? null };
  }
  if (!refreshToken) {
    return accessToken
      ? { token: accessToken, provider: parsed, accountEmail: conn.accountEmail ?? null }
      : null;
  }

  const refreshed =
    parsed === "microsoft"
      ? await refreshMicrosoftAccessToken(refreshToken)
      : await refreshGoogleAccessToken(refreshToken);
  await updateCalendarAccessToken(parsed, refreshed.accessToken, refreshed.expiresAt);
  return {
    token: refreshed.accessToken,
    provider: parsed,
    accountEmail: conn.accountEmail ?? null,
  };
}

export async function getCalDavCalendarCredentials(): Promise<{
  serverUrl: string;
  username: string;
  password: string;
  calendarUrl: string;
} | null> {
  const conn = await getCalendarConnection("caldav");
  if (!conn || conn.provider !== "caldav") return null;
  const { accessToken } = decryptConnectionTokens(conn);
  const username = conn.accountEmail?.trim();
  const serverUrl = conn.serverUrl?.trim();
  if (!username || !accessToken || !serverUrl) return null;
  return {
    serverUrl,
    username,
    password: accessToken,
    calendarUrl: conn.calendarId || "",
  };
}

export async function getICloudCalendarCredentials(): Promise<{
  appleId: string;
  appPassword: string;
  calendarUrl: string;
} | null> {
  const conn = await getCalendarConnection("icloud");
  if (!conn || conn.provider !== "icloud") return null;
  const { accessToken } = decryptConnectionTokens(conn);
  const appleId = conn.accountEmail?.trim();
  if (!appleId || !accessToken) return null;
  return {
    appleId,
    appPassword: accessToken,
    calendarUrl: conn.calendarId || "",
  };
}

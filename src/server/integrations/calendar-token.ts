import { prisma } from "@/lib/db";
import {
  decryptConnectionTokens,
  updateCalendarAccessToken,
} from "@/server/integrations/calendar-connection";
import { parseCalendarProvider } from "@/server/integrations/calendar-provider";
import { refreshGoogleAccessToken } from "@/server/integrations/google-oauth";
import { refreshMicrosoftAccessToken } from "@/server/integrations/microsoft-oauth";

export async function getValidCalendarAccessToken(): Promise<{
  token: string;
  provider: ReturnType<typeof parseCalendarProvider>;
  accountEmail: string | null;
} | null> {
  const conn = await prisma.calendarConnection.findUnique({ where: { id: "default" } });
  if (!conn) return null;

  const provider = parseCalendarProvider(conn.provider);
  const { accessToken, refreshToken } = decryptConnectionTokens(conn);

  if (provider === "icloud") {
    return accessToken
      ? { token: accessToken, provider, accountEmail: conn.accountEmail ?? null }
      : null;
  }

  const now = Date.now();
  const expires = conn.expiresAt?.getTime() ?? 0;
  if (accessToken && expires > now + 60_000) {
    return { token: accessToken, provider, accountEmail: conn.accountEmail ?? null };
  }
  if (!refreshToken) {
    return accessToken
      ? { token: accessToken, provider, accountEmail: conn.accountEmail ?? null }
      : null;
  }

  const refreshed =
    provider === "microsoft"
      ? await refreshMicrosoftAccessToken(refreshToken)
      : await refreshGoogleAccessToken(refreshToken);
  await updateCalendarAccessToken(refreshed.accessToken, refreshed.expiresAt);
  return {
    token: refreshed.accessToken,
    provider,
    accountEmail: conn.accountEmail ?? null,
  };
}

export async function getICloudCalendarCredentials(): Promise<{
  appleId: string;
  appPassword: string;
  calendarUrl: string;
} | null> {
  const conn = await prisma.calendarConnection.findUnique({ where: { id: "default" } });
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

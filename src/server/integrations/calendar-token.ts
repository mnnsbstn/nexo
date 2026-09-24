import { prisma } from "@/lib/db";
import {
  decryptConnectionTokens,
  updateCalendarAccessToken,
} from "@/server/integrations/calendar-connection";
import { refreshGoogleAccessToken } from "@/server/integrations/google-oauth";
import { refreshMicrosoftAccessToken } from "@/server/integrations/microsoft-oauth";

export async function getValidCalendarAccessToken(): Promise<{
  token: string;
  provider: "google" | "microsoft";
} | null> {
  const conn = await prisma.calendarConnection.findUnique({ where: { id: "default" } });
  if (!conn) return null;

  const provider = conn.provider === "microsoft" ? "microsoft" : "google";
  const { accessToken, refreshToken } = decryptConnectionTokens(conn);
  const now = Date.now();
  const expires = conn.expiresAt?.getTime() ?? 0;
  if (accessToken && expires > now + 60_000) {
    return { token: accessToken, provider };
  }
  if (!refreshToken) {
    return accessToken ? { token: accessToken, provider } : null;
  }

  const refreshed =
    provider === "microsoft"
      ? await refreshMicrosoftAccessToken(refreshToken)
      : await refreshGoogleAccessToken(refreshToken);
  await updateCalendarAccessToken(refreshed.accessToken, refreshed.expiresAt);
  return { token: refreshed.accessToken, provider };
}

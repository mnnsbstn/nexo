import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";
import type { CalendarProvider } from "@/server/integrations/calendar-provider";

export async function getCalendarConnection() {
  return prisma.calendarConnection.findUnique({ where: { id: "default" } });
}

export async function saveCalendarConnection(input: {
  provider: CalendarProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  accountEmail?: string | null;
  calendarId?: string;
}) {
  return prisma.calendarConnection.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      provider: input.provider,
      accessToken: encryptSecret(input.accessToken),
      refreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      expiresAt: input.expiresAt,
      accountEmail: input.accountEmail ?? null,
      calendarId: input.calendarId ?? "primary",
    },
    update: {
      provider: input.provider,
      accessToken: encryptSecret(input.accessToken),
      refreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      expiresAt: input.expiresAt,
      accountEmail: input.accountEmail ?? undefined,
      calendarId: input.calendarId ?? undefined,
    },
  });
}

export async function saveICloudCalendarConnection(input: {
  appleId: string;
  appPassword: string;
  calendarUrl: string;
}) {
  return saveCalendarConnection({
    provider: "icloud",
    accessToken: input.appPassword,
    refreshToken: null,
    expiresAt: null,
    accountEmail: input.appleId,
    calendarId: input.calendarUrl,
  });
}

export async function saveGoogleCalendarConnection(input: {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  accountEmail?: string | null;
}) {
  return saveCalendarConnection({ ...input, provider: "google" });
}

export async function saveMicrosoftCalendarConnection(input: {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  accountEmail?: string | null;
}) {
  return saveCalendarConnection({ ...input, provider: "microsoft" });
}

export async function updateCalendarAccessToken(accessToken: string, expiresAt: Date | null) {
  await prisma.calendarConnection.update({
    where: { id: "default" },
    data: {
      accessToken: encryptSecret(accessToken),
      expiresAt,
    },
  });
}

export function decryptConnectionTokens(conn: {
  accessToken: string;
  refreshToken: string | null;
}): { accessToken: string; refreshToken: string | null } {
  return {
    accessToken: decryptSecret(conn.accessToken),
    refreshToken: conn.refreshToken ? decryptSecret(conn.refreshToken) : null,
  };
}

export async function disconnectCalendar() {
  await prisma.calendarConnection.deleteMany({ where: { id: "default" } });
}

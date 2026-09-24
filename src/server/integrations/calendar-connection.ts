import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";
import type { CalendarProvider } from "@/server/integrations/calendar-provider";
import { parseCalendarProvider } from "@/server/integrations/calendar-provider";

export function connectionIdForProvider(provider: CalendarProvider): string {
  return provider;
}

let legacyMigrationDone = false;

/** Einmalig: alte Zeile `id=default` → `id=<provider>`. */
export async function migrateLegacyDefaultCalendarConnection(): Promise<void> {
  if (legacyMigrationDone) return;
  const legacy = await prisma.calendarConnection.findUnique({ where: { id: "default" } });
  if (!legacy) {
    legacyMigrationDone = true;
    return;
  }
  const provider = parseCalendarProvider(legacy.provider);
  const newId = connectionIdForProvider(provider);
  await prisma.$transaction(async (tx) => {
    await tx.calendarConnection.deleteMany({ where: { id: newId } });
    await tx.calendarConnection.create({
      data: {
        id: newId,
        provider: legacy.provider,
        accessToken: legacy.accessToken,
        refreshToken: legacy.refreshToken,
        expiresAt: legacy.expiresAt,
        calendarId: legacy.calendarId,
        accountEmail: legacy.accountEmail,
        connectedAt: legacy.connectedAt,
      },
    });
    await tx.calendarConnection.delete({ where: { id: "default" } });
  });
  legacyMigrationDone = true;
}

export async function listCalendarConnections() {
  await migrateLegacyDefaultCalendarConnection();
  return prisma.calendarConnection.findMany({ orderBy: { provider: "asc" } });
}

export async function getCalendarConnection(provider: CalendarProvider) {
  await migrateLegacyDefaultCalendarConnection();
  return prisma.calendarConnection.findUnique({
    where: { id: connectionIdForProvider(provider) },
  });
}

export async function saveCalendarConnection(input: {
  provider: CalendarProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  accountEmail?: string | null;
  calendarId?: string;
}) {
  await migrateLegacyDefaultCalendarConnection();
  const id = connectionIdForProvider(input.provider);
  return prisma.calendarConnection.upsert({
    where: { id },
    create: {
      id,
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

export async function updateCalendarAccessToken(
  provider: CalendarProvider,
  accessToken: string,
  expiresAt: Date | null,
) {
  await prisma.calendarConnection.update({
    where: { id: connectionIdForProvider(provider) },
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

export async function disconnectCalendar(provider: CalendarProvider) {
  await migrateLegacyDefaultCalendarConnection();
  await prisma.calendarConnection.deleteMany({
    where: { id: connectionIdForProvider(provider) },
  });
}

export async function disconnectAllCalendars() {
  await migrateLegacyDefaultCalendarConnection();
  await prisma.calendarConnection.deleteMany();
}

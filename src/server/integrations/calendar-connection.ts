import { prisma } from "@/lib/db";

export async function getCalendarConnection() {
  return prisma.calendarConnection.findUnique({ where: { id: "default" } });
}

export async function saveGoogleCalendarConnection(input: {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  accountEmail?: string | null;
}) {
  return prisma.calendarConnection.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      provider: "google",
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      accountEmail: input.accountEmail ?? null,
    },
    update: {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? undefined,
      expiresAt: input.expiresAt,
      accountEmail: input.accountEmail ?? undefined,
    },
  });
}

export async function disconnectCalendar() {
  await prisma.calendarConnection.deleteMany({ where: { id: "default" } });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/token-crypto";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Playwright/Staging-Smoke: abgelaufene OAuth-Verbindungen simulieren. */
export async function POST() {
  if (!isE2eCalendarMockEnabled()) return notFound();

  await prisma.userSettings.updateMany({
    data: { calendarIntegrationEnabled: true },
  });

  await prisma.calendarConnection.upsert({
    where: { id: "google" },
    create: {
      id: "google",
      provider: "google",
      accessToken: encryptSecret("staging-expired-google-access"),
      refreshToken: null,
      expiresAt: new Date(Date.now() - 86_400_000),
      accountEmail: "staging-google@nexo.test",
    },
    update: {
      accessToken: encryptSecret("staging-expired-google-access"),
      refreshToken: null,
      expiresAt: new Date(Date.now() - 86_400_000),
      accountEmail: "staging-google@nexo.test",
    },
  });

  await prisma.calendarConnection.upsert({
    where: { id: "microsoft" },
    create: {
      id: "microsoft",
      provider: "microsoft",
      accessToken: encryptSecret("staging-expired-ms-access"),
      refreshToken: encryptSecret("staging-invalid-refresh-token"),
      expiresAt: new Date(Date.now() - 86_400_000),
      accountEmail: "staging-ms@nexo.test",
    },
    update: {
      accessToken: encryptSecret("staging-expired-ms-access"),
      refreshToken: encryptSecret("staging-invalid-refresh-token"),
      expiresAt: new Date(Date.now() - 86_400_000),
      accountEmail: "staging-ms@nexo.test",
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!isE2eCalendarMockEnabled()) return notFound();
  await prisma.calendarConnection.deleteMany({
    where: { id: { in: ["google", "microsoft"] } },
  });
  return NextResponse.json({ ok: true });
}

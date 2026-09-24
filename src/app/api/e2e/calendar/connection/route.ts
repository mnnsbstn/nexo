import { NextResponse } from "next/server";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";
import {
  disconnectCalendar,
  saveGoogleCalendarConnection,
} from "@/server/integrations/calendar-connection";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  if (!isE2eCalendarMockEnabled()) return notFound();

  await saveGoogleCalendarConnection({
    accessToken: "e2e-access-token",
    refreshToken: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    accountEmail: "e2e@nexo.test",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!isE2eCalendarMockEnabled()) return notFound();
  await disconnectCalendar();
  return NextResponse.json({ ok: true });
}

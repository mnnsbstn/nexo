import { NextResponse } from "next/server";
import { z } from "zod";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";
import {
  disconnectAllCalendars,
  saveCalDavCalendarConnection,
  saveGoogleCalendarConnection,
  saveMicrosoftCalendarConnection,
} from "@/server/integrations/calendar-connection";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

const bodySchema = z.object({
  provider: z.enum(["google", "microsoft", "caldav"]).optional(),
});

export async function POST(req: Request) {
  if (!isE2eCalendarMockEnabled()) return notFound();

  let provider: "google" | "microsoft" | "caldav" = "google";
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (parsed.success && parsed.data.provider) {
      provider = parsed.data.provider;
    }
  } catch {
    /* default google */
  }

  if (provider === "caldav") {
    await saveCalDavCalendarConnection({
      serverUrl: "https://e2e-caldav.test",
      username: "e2e-caldav@nexo.test",
      password: "e2e-caldav-password",
      calendarUrl: "https://e2e-caldav.test/cal/home/",
    });
  } else if (provider === "microsoft") {
    await saveMicrosoftCalendarConnection({
      accessToken: "e2e-ms-access-token",
      refreshToken: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      accountEmail: "e2e-ms@nexo.test",
    });
  } else {
    await saveGoogleCalendarConnection({
      accessToken: "e2e-access-token",
      refreshToken: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      accountEmail: "e2e@nexo.test",
    });
  }

  return NextResponse.json({ ok: true, provider });
}

export async function DELETE() {
  if (!isE2eCalendarMockEnabled()) return notFound();
  await disconnectAllCalendars();
  return NextResponse.json({ ok: true });
}

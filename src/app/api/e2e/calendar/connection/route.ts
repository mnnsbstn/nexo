import { NextResponse } from "next/server";
import { z } from "zod";
import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";
import {
  disconnectAllCalendars,
  saveGoogleCalendarConnection,
  saveMicrosoftCalendarConnection,
} from "@/server/integrations/calendar-connection";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

const bodySchema = z.object({
  provider: z.enum(["google", "microsoft"]).optional(),
});

export async function POST(req: Request) {
  if (!isE2eCalendarMockEnabled()) return notFound();

  let provider: "google" | "microsoft" = "google";
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (parsed.success && parsed.data.provider) {
      provider = parsed.data.provider;
    }
  } catch {
    /* default google */
  }

  if (provider === "microsoft") {
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

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { listExternalInboxMessages } from "@/server/integrations/email-read";
import { formatInTimeZone } from "date-fns-tz";
import { de } from "date-fns/locale";

export async function GET(req: Request) {
  const settings = await getSettings();
  if (!settings.emailIntegrationEnabled) {
    return NextResponse.json({
      connected: false,
      messages: [],
      message: "E-Mail-Integration deaktiviert.",
    });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "8");
  const result = await listExternalInboxMessages({ limit });

  return NextResponse.json({
    ...result,
    messages: result.messages.map((m) => ({
      ...m,
      dateLabel: formatInTimeZone(new Date(m.date), settings.timezone, "d. MMM yyyy, HH:mm", {
        locale: de,
      }),
    })),
  });
}

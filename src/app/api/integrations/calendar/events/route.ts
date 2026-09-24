import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { listExternalCalendarEvents } from "@/server/integrations/calendar-read";
import { formatInTimeZone } from "date-fns-tz";
import { de } from "date-fns/locale";

export async function GET(req: Request) {
  const settings = await getSettings();
  if (!settings.calendarIntegrationEnabled) {
    return NextResponse.json(
      { error: "Kalender-Integration ist deaktiviert." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const limit = url.searchParams.get("limit");
  const daysAhead = url.searchParams.get("daysAhead");

  const result = await listExternalCalendarEvents({
    limit: limit ? Number(limit) : undefined,
    daysAhead: daysAhead ? Number(daysAhead) : undefined,
  });

  return NextResponse.json({
    ...result,
    events: result.events.map((e) => ({
      ...e,
      startLabel: e.allDay
        ? formatInTimeZone(new Date(e.startAt), settings.timezone, "d. MMM yyyy", { locale: de })
        : formatInTimeZone(new Date(e.startAt), settings.timezone, "d. MMM yyyy, HH:mm", {
            locale: de,
          }),
    })),
  });
}

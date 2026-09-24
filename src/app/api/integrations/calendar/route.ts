import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import {
  getCalendarIntegrationStatus,
  listCalendarDrafts,
} from "@/server/integrations/calendar";
import { formatInTimeZone } from "date-fns-tz";
import { de } from "date-fns/locale";

export async function GET() {
  const settings = await getSettings();
  const status = await getCalendarIntegrationStatus(settings);
  const drafts = await listCalendarDrafts(15);

  return NextResponse.json({
    ...status,
    drafts: drafts.map((d) => ({
      id: d.id,
      title: d.title,
      startAt: d.startAt.toISOString(),
      endAt: d.endAt?.toISOString() ?? null,
      status: d.status,
      externalEventId: d.externalEventId,
      startLabel: formatInTimeZone(d.startAt, settings.timezone, "d. MMM yyyy, HH:mm", {
        locale: de,
      }),
    })),
  });
}

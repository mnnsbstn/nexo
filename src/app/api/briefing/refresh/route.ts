import { NextResponse } from "next/server";
import { refreshBriefing } from "@/server/daily/briefing";
import { getSettings } from "@/lib/settings";
import { formatBriefingTimestamp } from "@/server/daily/briefing";

export async function POST() {
  const briefing = await refreshBriefing();
  const settings = await getSettings();
  return NextResponse.json({
    content: briefing.content,
    generatedAt: briefing.generatedAt.toISOString(),
    generatedAtLabel: formatBriefingTimestamp(briefing.generatedAt, settings.timezone),
  });
}

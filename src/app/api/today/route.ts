import { NextResponse } from "next/server";
import { getDailyContext } from "@/server/tools/read";
import { getSettings } from "@/lib/settings";
import { formatDueDisplay } from "@/lib/dates";
import { formatBriefingTimestamp } from "@/server/daily/briefing";
import { serializeTask } from "@/lib/serialize";

export async function GET() {
  const settings = await getSettings();
  const ctx = await getDailyContext();

  return NextResponse.json({
    timezone: ctx.timezone,
    today: ctx.today,
    dueToday: ctx.dueToday.map(serializeTask),
    overdue: ctx.overdue.map(serializeTask),
    noDate: ctx.noDate.map(serializeTask),
    priorities: ctx.priorities,
    briefing: ctx.latestBriefing
      ? {
          content: ctx.latestBriefing.content,
          generatedAt: ctx.latestBriefing.generatedAt.toISOString(),
          generatedAtLabel: formatBriefingTimestamp(
            ctx.latestBriefing.generatedAt,
            settings.timezone,
          ),
        }
      : null,
    dueLabels: Object.fromEntries(
      [...ctx.dueToday, ...ctx.overdue, ...ctx.noDate].map((t) => [
        t.id,
        formatDueDisplay(t.dueDate, t.dueAt, settings.timezone),
      ]),
    ),
  });
}

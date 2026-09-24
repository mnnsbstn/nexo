import { NextResponse } from "next/server";
import { getDailyContext } from "@/server/tools/read";
import { getSettings } from "@/lib/settings";
import { formatDueDisplay } from "@/lib/dates";
import { formatBriefingTimestamp } from "@/server/daily/briefing";
import { getActiveDayPlan, parseDayPlanItems } from "@/server/daily/day-plan";
import { serializeTask } from "@/lib/serialize";
import { formatInTimeZone } from "date-fns-tz";
import { de } from "date-fns/locale";

export async function GET() {
  const settings = await getSettings();
  const ctx = await getDailyContext();
  const dayPlan = await getActiveDayPlan(ctx.today);

  return NextResponse.json({
    timezone: ctx.timezone,
    today: ctx.today,
    dueToday: ctx.dueToday.map(serializeTask),
    overdue: ctx.overdue.map(serializeTask),
    dueSoon: ctx.dueSoon.map(serializeTask),
    noDate: ctx.noDate.map(serializeTask),
    priorities: ctx.priorities,
    dayPlan: dayPlan
      ? {
          id: dayPlan.id,
          planDate: dayPlan.planDate,
          intro: dayPlan.intro,
          items: parseDayPlanItems(dayPlan.items),
          confirmedAt: dayPlan.confirmedAt.toISOString(),
          confirmedAtLabel: formatInTimeZone(
            dayPlan.confirmedAt,
            settings.timezone,
            "d. MMM yyyy, HH:mm 'Uhr'",
            { locale: de },
          ),
          source: dayPlan.source,
        }
      : null,
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
      [...ctx.dueToday, ...ctx.overdue, ...ctx.dueSoon, ...ctx.noDate].map((t) => [
        t.id,
        formatDueDisplay(t.dueDate, t.dueAt, settings.timezone),
      ]),
    ),
    notifications: {
      inAppEnabled: settings.notifyInAppDueTasks,
      browserEnabled: settings.notifyBrowserDueTasks,
    },
  });
}

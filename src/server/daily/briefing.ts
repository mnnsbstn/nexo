import { prisma } from "@/lib/db";
import { getDailyContext } from "@/server/tools/read";
import { formatInTimeZone } from "date-fns-tz";
import { de } from "date-fns/locale";

export async function generateBriefingText(): Promise<string> {
  const ctx = await getDailyContext();
  const lines: string[] = [];
  lines.push(`Kurzbriefing für ${ctx.today} (${ctx.timezone}).`);
  lines.push("");

  if (ctx.overdue.length) {
    lines.push(`Überfällig (${ctx.overdue.length}): ${ctx.overdue.map((t) => t.title).join("; ")}`);
  }
  if (ctx.dueToday.length) {
    lines.push(`Heute fällig (${ctx.dueToday.length}): ${ctx.dueToday.map((t) => t.title).join("; ")}`);
  }
  if (!ctx.overdue.length && !ctx.dueToday.length) {
    lines.push("Keine überfälligen oder heute fälligen Aufgaben.");
  }

  if (ctx.priorities.length) {
    lines.push("");
    lines.push("Vorgeschlagene Prioritäten:");
    for (const p of ctx.priorities) {
      lines.push(`• ${p.title} — ${p.reason}`);
    }
  }

  if (ctx.noDate.length) {
    lines.push("");
    lines.push(`${ctx.noDate.length} offene Aufgabe(n) ohne Datum.`);
  }

  if (ctx.recentMemories.length) {
    lines.push("");
    lines.push("Aktive Erinnerungen (Auszug):");
    for (const m of ctx.recentMemories.slice(0, 3)) {
      lines.push(`• ${m.content.slice(0, 120)}${m.content.length > 120 ? "…" : ""}`);
    }
  }

  lines.push("");
  lines.push(
    "Hinweis: Kein Kalender oder E-Mail angebunden — nur Daten aus Nexo.",
  );

  return lines.join("\n");
}

export async function refreshBriefing() {
  const content = await generateBriefingText();
  const briefing = await prisma.dailyBriefing.create({ data: { content } });
  return briefing;
}

export function formatBriefingTimestamp(iso: Date, timezone: string): string {
  return formatInTimeZone(iso, timezone, "d. MMM yyyy, HH:mm 'Uhr'", { locale: de });
}

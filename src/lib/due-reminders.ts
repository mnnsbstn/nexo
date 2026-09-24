export type DueReminderTask = { title: string };

export function hasDueReminders(
  overdue: DueReminderTask[],
  dueToday: DueReminderTask[],
): boolean {
  return overdue.length > 0 || dueToday.length > 0;
}

export function buildDueReminderSummary(
  overdue: DueReminderTask[],
  dueToday: DueReminderTask[],
): { headline: string; detail: string } {
  const parts: string[] = [];
  if (overdue.length > 0) {
    parts.push(
      overdue.length === 1
        ? "1 überfällige Aufgabe"
        : `${overdue.length} überfällige Aufgaben`,
    );
  }
  if (dueToday.length > 0) {
    parts.push(
      dueToday.length === 1 ? "1 heute fällig" : `${dueToday.length} heute fällig`,
    );
  }
  const headline = parts.join(" · ");
  const titles = [...overdue, ...dueToday].slice(0, 4).map((t) => t.title);
  const more = overdue.length + dueToday.length - titles.length;
  let detail = titles.join("; ");
  if (more > 0) detail += `; +${more} weitere`;
  return { headline, detail };
}

export function buildBrowserNotificationPayload(
  overdue: DueReminderTask[],
  dueToday: DueReminderTask[],
): { title: string; body: string } {
  const { headline, detail } = buildDueReminderSummary(overdue, dueToday);
  return {
    title: "Nexo — fällige Aufgaben",
    body: detail ? `${headline}: ${detail}` : headline,
  };
}

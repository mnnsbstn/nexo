import type { Task } from "@prisma/client";
import { isOverdue, isDueToday } from "@/lib/dates";

export type PrioritySuggestion = {
  taskId: string;
  title: string;
  reason: string;
  suggested: true;
  userPriority: string | null;
};

export function buildPrioritySuggestions(tasks: Task[], timezone: string): PrioritySuggestion[] {
  const open = tasks.filter((t) => t.status === "open");
  const scored = open.map((task) => {
    let score = 0;
    const reasons: string[] = [];

    if (isOverdue(task.dueDate, task.dueAt, timezone)) {
      score += 100;
      reasons.push("überfällig");
    } else if (isDueToday(task.dueDate, task.dueAt, timezone)) {
      score += 80;
      reasons.push("heute fällig");
    }

    if (task.priority === "high") {
      score += 40;
      reasons.push("von dir als hoch priorisiert");
    } else if (task.priority === "medium") {
      score += 20;
    }

    if (!task.dueDate && !task.dueAt && task.priority === "high") {
      score += 10;
      reasons.push("wichtig, aber ohne Datum");
    }

    return { task, score, reasons };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ task, reasons }) => ({
      taskId: task.id,
      title: task.title,
      reason: reasons.join(", ") || "offene Aufgabe",
      suggested: true as const,
      userPriority: task.priority,
    }));
}

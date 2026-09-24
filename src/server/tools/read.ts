import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  isDueToday,
  isDueSoon,
  isOverdue,
  todayDateKey,
  formatDueDisplay,
} from "@/lib/dates";
import { buildPrioritySuggestions } from "@/server/daily/priorities";

export async function listTasks(filters?: { status?: string }) {
  return prisma.task.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    orderBy: [{ dueAt: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getTask(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId } });
}

export async function searchMemories(query: string, limit = 20) {
  const q = query.trim().toLowerCase();
  const memories = await prisma.memory.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  if (!q) return memories.slice(0, limit);
  return memories
    .filter((m) => m.content.toLowerCase().includes(q))
    .slice(0, limit);
}

export async function getDailyContext() {
  const settings = await getSettings();
  const tz = settings.timezone;
  const today = todayDateKey(tz);
  const openTasks = await prisma.task.findMany({
    where: { status: "open" },
    orderBy: [{ dueAt: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
  });

  const dueToday = openTasks.filter((t) => isDueToday(t.dueDate, t.dueAt, tz));
  const overdue = openTasks.filter(
    (t) =>
      (t.dueDate || t.dueAt) &&
      isOverdue(t.dueDate, t.dueAt, tz) &&
      !isDueToday(t.dueDate, t.dueAt, tz),
  );
  const noDate = openTasks.filter((t) => !t.dueDate && !t.dueAt);
  const dueSoon = openTasks.filter((t) => isDueSoon(t.dueDate, t.dueAt, tz));
  const priorities = buildPrioritySuggestions(openTasks, tz).slice(0, 3);
  const memories = await prisma.memory.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  const latestBriefing = await prisma.dailyBriefing.findFirst({
    orderBy: { generatedAt: "desc" },
  });

  return {
    timezone: tz,
    today,
    dueToday,
    overdue,
    dueSoon,
    noDate,
    priorities,
    recentMemories: memories,
    latestBriefing,
    taskSummary: openTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due: formatDueDisplay(t.dueDate, t.dueAt, tz),
    })),
  };
}

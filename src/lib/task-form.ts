/** Map API task to HTML date/time inputs (Europe/Berlin for dueAt). */
export function taskToDateTimeFields(task: {
  dueDate: string | null;
  dueAt: string | null;
}): { dueDate: string; dueTime: string } {
  if (task.dueAt) {
    const d = new Date(task.dueAt);
    const dueDate = d.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
    const dueTime = d.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return { dueDate, dueTime };
  }
  return { dueDate: task.dueDate ?? "", dueTime: "" };
}

export function buildDuePayload(dueDate: string, dueTime: string): {
  dueDate: string | null;
  dueAt: string | null;
} {
  if (!dueDate.trim()) {
    return { dueDate: null, dueAt: null };
  }
  if (dueTime.trim()) {
    const local = `${dueDate}T${dueTime}:00`;
    const parsed = new Date(local);
    return { dueDate, dueAt: parsed.toISOString() };
  }
  return { dueDate, dueAt: null };
}

"use client";

import { useEffect } from "react";
import {
  buildBrowserNotificationPayload,
  hasDueReminders,
  type DueReminderTask,
} from "@/lib/due-reminders";

const SESSION_PREFIX = "nexo-browser-due-notified";

export function useBrowserDueNotification(
  enabled: boolean,
  todayKey: string,
  overdue: DueReminderTask[],
  dueToday: DueReminderTask[],
) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!hasDueReminders(overdue, dueToday)) return;

    const storageKey = `${SESSION_PREFIX}:${todayKey}:${overdue.length}:${dueToday.length}`;
    if (sessionStorage.getItem(storageKey)) return;

    const { title, body } = buildBrowserNotificationPayload(overdue, dueToday);
    try {
      new Notification(title, { body, tag: "nexo-due-tasks" });
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore — e.g. insecure context
    }
  }, [enabled, todayKey, overdue, dueToday]);
}

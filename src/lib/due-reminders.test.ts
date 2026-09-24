import { describe, expect, it } from "vitest";
import {
  buildBrowserNotificationPayload,
  buildDueReminderSummary,
  hasDueReminders,
} from "@/lib/due-reminders";

describe("due-reminders", () => {
  it("hasDueReminders is false when empty", () => {
    expect(hasDueReminders([], [])).toBe(false);
  });

  it("builds summary for overdue and today", () => {
    const { headline, detail } = buildDueReminderSummary(
      [{ title: "Alt" }],
      [{ title: "Heute" }, { title: "Auch heute" }],
    );
    expect(headline).toContain("überfällig");
    expect(headline).toContain("heute fällig");
    expect(detail).toContain("Alt");
    expect(detail).toContain("Heute");
  });

  it("builds browser notification payload", () => {
    const p = buildBrowserNotificationPayload([{ title: "X" }], []);
    expect(p.title).toMatch(/Nexo/);
    expect(p.body).toContain("X");
  });
});

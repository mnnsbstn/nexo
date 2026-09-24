import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { buildDayPlanDraft, persistDayPlan, getActiveDayPlan } from "@/server/daily/day-plan";

beforeEach(async () => {
  await prisma.dayPlan.deleteMany();
});

describe("day plan", () => {
  it("builds at least one item when no tasks", async () => {
    const draft = await buildDayPlanDraft("2026-09-24");
    expect(draft.items.length).toBeGreaterThan(0);
    expect(draft.planDate).toBe("2026-09-24");
  });

  it("replaces active plan for same date on persist", async () => {
    const draft = await buildDayPlanDraft("2026-09-24");
    await persistDayPlan(draft);
    const second = { ...draft, intro: "updated" };
    await persistDayPlan(second);
    const active = await getActiveDayPlan("2026-09-24");
    expect(active?.intro).toBe("updated");
    const all = await prisma.dayPlan.findMany({ where: { planDate: "2026-09-24" } });
    expect(all.filter((p) => p.isActive).length).toBe(1);
  });
});

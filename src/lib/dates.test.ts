import { describe, it, expect } from "vitest";
import { parseGermanDuePhrase, todayDateKey, isDueToday, isDueSoon } from "@/lib/dates";

describe("parseGermanDuePhrase", () => {
  it("parses morgen um 10 Uhr in Europe/Berlin", () => {
    const ref = new Date("2026-03-24T08:00:00.000Z");
    const result = parseGermanDuePhrase("morgen um 10 Uhr", "Europe/Berlin", ref);
    expect(result).not.toBeNull();
    expect(result!.dueDate).toBe("2026-03-25");
    expect(result!.dueAt).toBeDefined();
    expect(result!.label).toMatch(/10:00/);
  });

  it("parses heute without time as date only", () => {
    const ref = new Date("2026-03-24T10:00:00.000Z");
    const result = parseGermanDuePhrase("heute", "Europe/Berlin", ref);
    expect(result?.dueDate).toBe(todayDateKey("Europe/Berlin", ref));
    expect(result?.dueAt).toBeUndefined();
  });
});

describe("isDueToday", () => {
  it("matches dueDate key", () => {
    const now = new Date("2026-03-24T12:00:00.000Z");
    expect(isDueToday("2026-03-24", null, "Europe/Berlin", now)).toBe(true);
  });
});

describe("isDueSoon", () => {
  it("includes tomorrow but not today", () => {
    const now = new Date("2026-03-24T12:00:00.000Z");
    expect(isDueSoon("2026-03-25", null, "Europe/Berlin", 7, now)).toBe(true);
    expect(isDueSoon("2026-03-24", null, "Europe/Berlin", 7, now)).toBe(false);
  });
});

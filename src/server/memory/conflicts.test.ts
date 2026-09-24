import { describe, it, expect } from "vitest";
import { memoryContentOverlap, tokenizeMemoryContent } from "@/server/memory/conflicts";

describe("memory conflicts", () => {
  it("tokenizes german content", () => {
    expect(tokenizeMemoryContent("Ich bevorzuge kurze Antworten").size).toBeGreaterThan(0);
  });

  it("detects overlap on shared topic words", () => {
    const a = "Ich bevorzuge kurze Antworten im Chat";
    const b = "Bitte kurze Antworten ohne Floskeln";
    expect(memoryContentOverlap(a, b)).toBeGreaterThanOrEqual(2);
  });

  it("low overlap for unrelated texts", () => {
    expect(memoryContentOverlap("Team-Meeting montags", "Rechnung bis Freitag")).toBeLessThan(2);
  });
});

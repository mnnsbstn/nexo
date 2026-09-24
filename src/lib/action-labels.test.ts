import { describe, it, expect } from "vitest";
import { statusesForFilter } from "@/lib/action-labels";

describe("statusesForFilter", () => {
  it("maps open filter", () => {
    expect(statusesForFilter("open")).toContain("awaiting_confirmation");
  });

  it("returns null for all", () => {
    expect(statusesForFilter("all")).toBeNull();
  });
});

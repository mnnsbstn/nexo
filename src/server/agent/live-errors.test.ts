import { describe, expect, it } from "vitest";
import { toUserFacingLiveError } from "@/server/agent/live-errors";

describe("toUserFacingLiveError", () => {
  it("maps 401 to German hint", () => {
    expect(toUserFacingLiveError("Error 401 Unauthorized")).toContain("API-Schlüssel");
  });

  it("maps rate limit", () => {
    expect(toUserFacingLiveError("429 rate limit exceeded")).toContain("Rate Limit");
  });
});

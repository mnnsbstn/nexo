import { describe, expect, it } from "vitest";
import { buildIcsForDraft } from "@/server/integrations/ics";

describe("buildIcsForDraft", () => {
  it("includes summary and dtstart", () => {
    const ics = buildIcsForDraft({
      id: "draft1",
      title: "Team Call",
      startAt: new Date("2026-09-25T08:00:00.000Z"),
      endAt: new Date("2026-09-25T09:00:00.000Z"),
      description: null,
      timezone: "Europe/Berlin",
      status: "draft",
      externalEventId: null,
      exportError: null,
      exportedAt: null,
      proposalId: null,
      createdAt: new Date(),
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Team Call");
    expect(ics).toContain("DTSTART:");
  });
});

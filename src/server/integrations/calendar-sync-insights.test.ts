import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { findCalendarDraftOverlaps } from "@/server/integrations/calendar-sync-insights";

describe("findCalendarDraftOverlaps", () => {
  beforeEach(async () => {
    await prisma.externalCalendarDraft.deleteMany();
  });

  it("detects time overlap between draft and external event", async () => {
    const draft = await prisma.externalCalendarDraft.create({
      data: {
        title: "Team Call",
        startAt: new Date("2026-09-25T10:00:00.000Z"),
        endAt: new Date("2026-09-25T11:00:00.000Z"),
        status: "draft",
      },
    });

    const overlaps = await findCalendarDraftOverlaps([
      {
        id: "ext-1",
        title: "Andere Besprechung",
        startAt: "2026-09-25T10:30:00.000Z",
        endAt: "2026-09-25T11:30:00.000Z",
        allDay: false,
        provider: "google",
      },
    ]);

    expect(overlaps.length).toBe(1);
    expect(overlaps[0]?.draftId).toBe(draft.id);
    expect(overlaps[0]?.reason).toBe("time_overlap");
  });
});

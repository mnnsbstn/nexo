import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { proposeAction } from "@/server/actions/propose";
import { executeProposal } from "@/server/actions/execute";

describe("external_calendar_draft execution", () => {
  beforeEach(async () => {
    await prisma.externalCalendarDraft.deleteMany();
    await prisma.actionProposal.deleteMany();
    await prisma.userSettings.update({
      where: { id: "default" },
      data: { calendarIntegrationEnabled: true },
    });
  });

  it("stores draft after confirm", async () => {
    const proposal = await proposeAction({
      payload: {
        actionType: "external_calendar_draft",
        data: {
          title: "Sync",
          startAt: "2026-09-25T10:00:00.000Z",
          endAt: "2026-09-25T11:00:00.000Z",
        },
      },
      summary: "Kalender-Entwurf",
      affectedData: "Sync",
      scope: "external",
    });

    const { result } = await executeProposal(proposal.id);
    expect(result?.draftId).toBeTruthy();
    expect(result?.connected).toBe(false);

    const drafts = await prisma.externalCalendarDraft.findMany();
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.title).toBe("Sync");
  });
});

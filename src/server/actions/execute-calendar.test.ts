import { describe, expect, it, beforeEach } from "vitest";
import { prisma, ensureDefaultSettings } from "@/lib/db";
import { proposeAction } from "@/server/actions/propose";
import { executeProposal } from "@/server/actions/execute";

describe("external_calendar_draft execution", () => {
  beforeEach(async () => {
    await prisma.externalCalendarDraft.deleteMany();
    await prisma.calendarConnection.deleteMany();
    await prisma.actionProposal.deleteMany({ where: { actionType: "external_calendar_draft" } });
    await ensureDefaultSettings();
    await prisma.userSettings.update({
      where: { id: "default" },
      data: { calendarIntegrationEnabled: true },
    });
  });

  it("stores draft after confirm", async () => {
    const title = `Sync ${Date.now()}`;
    const proposal = await proposeAction({
      payload: {
        actionType: "external_calendar_draft",
        data: {
          title,
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
    expect(result?.exported).toBe(false);

    const drafts = await prisma.externalCalendarDraft.findMany();
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.title).toBe(title);
  });
});

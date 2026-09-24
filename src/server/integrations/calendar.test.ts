import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getCalendarIntegrationStatus,
  persistCalendarDraft,
} from "@/server/integrations/calendar";

describe("calendar integration", () => {
  beforeEach(async () => {
    await prisma.externalCalendarDraft.deleteMany();
  });

  it("reports disabled status", async () => {
    const status = await getCalendarIntegrationStatus({
      uiLanguage: "de",
      responseLanguage: "de",
      timezone: "Europe/Berlin",
      notifyInAppDueTasks: false,
      notifyBrowserDueTasks: false,
      calendarIntegrationEnabled: false,
    });
    expect(status.connected).toBe(false);
    expect(status.enabled).toBe(false);
  });

  it("persists draft linked to proposal", async () => {
    const draft = await persistCalendarDraft(
      {
        title: "Call",
        startAt: new Date("2026-09-25T08:00:00.000Z").toISOString(),
        endAt: new Date("2026-09-25T09:00:00.000Z").toISOString(),
        timezone: "Europe/Berlin",
      },
      "prop_test_1",
    );
    expect(draft.status).toBe("draft");
    expect(draft.proposalId).toBe("prop_test_1");
  });
});

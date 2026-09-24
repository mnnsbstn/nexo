import { describe, expect, it, beforeEach } from "vitest";
import { prisma, ensureDefaultSettings } from "@/lib/db";
import { getEmailIntegrationStatus, finalizeEmailDraft, persistEmailDraft } from "@/server/integrations/email";
import { getSettings } from "@/lib/settings";

describe("email integration", () => {
  beforeEach(async () => {
    await ensureDefaultSettings();
    await prisma.externalEmailDraft.deleteMany();
    await prisma.userSettings.update({
      where: { id: "default" },
      data: { emailIntegrationEnabled: true },
    });
  });

  it("reports disabled when opt-in off", async () => {
    await prisma.userSettings.update({
      where: { id: "default" },
      data: { emailIntegrationEnabled: false },
    });
    const settings = await getSettings();
    const status = await getEmailIntegrationStatus(settings);
    expect(status.enabled).toBe(false);
    expect(status.sendConfigured).toBe(false);
  });

  it("saves draft without sending", async () => {
    const draft = await persistEmailDraft(
      {
        to: ["a@example.com"],
        subject: "Test",
        body: "Hallo",
      },
      "prop-1",
    );
    const result = await finalizeEmailDraft(draft.id);
    expect(result.saved).toBe(true);
    expect(result.sent).toBe(false);

    const updated = await prisma.externalEmailDraft.findUnique({ where: { id: draft.id } });
    expect(updated?.status).toBe("saved");
  });
});

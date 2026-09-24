import { describe, expect, it, beforeEach, vi } from "vitest";
import { prisma, ensureDefaultSettings } from "@/lib/db";
import {
  getEmailIntegrationStatus,
  finalizeEmailDraft,
  persistEmailDraft,
  sendEmailDraft,
} from "@/server/integrations/email";
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

  it("reports sendConfigured when SMTP env set", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.test");
    vi.stubEnv("SMTP_FROM", "from@test");
    const settings = await getSettings();
    const status = await getEmailIntegrationStatus(settings);
    expect(status.sendConfigured).toBe(true);
    vi.unstubAllEnvs();
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

  it("sendEmailDraft uses E2E mock without SMTP", async () => {
    vi.stubEnv("NEXO_E2E_EMAIL_MOCK", "1");
    const draft = await persistEmailDraft(
      { to: ["b@example.com"], subject: "Send", body: "Hi" },
      "prop-2",
    );
    await finalizeEmailDraft(draft.id);
    const result = await sendEmailDraft(draft.id);
    expect(result.sent).toBe(true);
    const updated = await prisma.externalEmailDraft.findUnique({ where: { id: draft.id } });
    expect(updated?.status).toBe("sent");
    vi.unstubAllEnvs();
  });
});

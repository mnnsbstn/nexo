import { describe, expect, it, beforeEach } from "vitest";
import { prisma, ensureDefaultSettings } from "@/lib/db";
import { executeProposal } from "@/server/actions/execute";

describe("external_email_draft execution", () => {
  beforeEach(async () => {
    await ensureDefaultSettings();
    await prisma.externalEmailDraft.deleteMany();
    await prisma.actionProposal.deleteMany({ where: { actionType: "external_email_draft" } });
    await prisma.userSettings.update({
      where: { id: "default" },
      data: { emailIntegrationEnabled: true },
    });
  });

  it("stores draft after confirm", async () => {
    const proposal = await prisma.actionProposal.create({
      data: {
        actionType: "external_email_draft",
        payload: JSON.stringify({
          actionType: "external_email_draft",
          data: {
            to: ["team@example.com"],
            subject: "Sync",
            body: "Hallo Team",
          },
        }),
        summary: "E-Mail-Entwurf: Sync",
        affectedData: "An team@example.com",
        scope: "external",
        status: "awaiting_confirmation",
        idempotencyKey: `email-test-${Date.now()}`,
      },
    });

    const { proposal: done } = await executeProposal(proposal.id);
    expect(done.status).toBe("succeeded");

    const draft = await prisma.externalEmailDraft.findFirst({
      where: { proposalId: proposal.id },
    });
    expect(draft?.subject).toBe("Sync");
    expect(draft?.status).toBe("saved");
  });
});

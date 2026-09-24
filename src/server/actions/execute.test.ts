import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { proposeAction } from "@/server/actions/propose";
import { executeProposal, rejectProposal } from "@/server/actions/execute";

beforeEach(async () => {
  await prisma.actionProposal.deleteMany();
  await prisma.task.deleteMany();
});

describe("executeProposal idempotency", () => {
  it("does not duplicate tasks on double confirm", async () => {
    const proposal = await proposeAction({
      payload: {
        actionType: "create_task",
        data: { title: "Test Aufgabe" },
      },
      summary: "test",
      affectedData: "test",
    });

    await executeProposal(proposal.id);
    const second = await executeProposal(proposal.id);
    expect(second.alreadyDone).toBe(true);

    const tasks = await prisma.task.findMany({ where: { title: "Test Aufgabe" } });
    expect(tasks.length).toBe(1);
  });

  it("reject does not create task", async () => {
    const proposal = await proposeAction({
      payload: {
        actionType: "create_task",
        data: { title: "Abgelehnt" },
      },
      summary: "test",
      affectedData: "test",
    });
    await rejectProposal(proposal.id);
    await expect(executeProposal(proposal.id)).rejects.toThrow();
    expect(await prisma.task.count({ where: { title: "Abgelehnt" } })).toBe(0);
  });
});

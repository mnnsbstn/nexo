import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { executeAgentTool } from "@/server/tools/agent-tools";

beforeEach(async () => {
  await prisma.task.deleteMany({ where: { title: "Live Tool Test" } });
});

describe("executeAgentTool", () => {
  it("list_tasks returns open tasks", async () => {
    await prisma.task.create({ data: { title: "Live Tool Test", status: "open" } });
    const res = await executeAgentTool("list_tasks", JSON.stringify({ status: "open" }), {
      conversationId: "c1",
      messageId: "m1",
    });
    const parsed = JSON.parse(res.output) as { tasks: { title: string }[] };
    expect(parsed.tasks.some((t) => t.title === "Live Tool Test")).toBe(true);
  });

  it("rejects unknown tool", async () => {
    const res = await executeAgentTool("shell_exec", "{}", {
      conversationId: "c1",
      messageId: "m1",
    });
    expect(res.output).toContain("Unbekanntes Tool");
  });
});

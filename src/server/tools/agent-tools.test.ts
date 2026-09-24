import { describe, it, expect, beforeEach } from "vitest";
import { prisma, ensureDefaultSettings } from "@/lib/db";
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

  it("returns structured error for invalid get_task args", async () => {
    const res = await executeAgentTool("get_task", JSON.stringify({}), {
      conversationId: "c1",
      messageId: "m1",
    });
    const parsed = JSON.parse(res.output) as { error: string; details?: string };
    expect(parsed.error).toContain("get_task");
    expect(parsed.details).toBeTruthy();
  });

  it("list_external_calendar_events when integration disabled", async () => {
    await ensureDefaultSettings();
    await prisma.userSettings.update({
      where: { id: "default" },
      data: { calendarIntegrationEnabled: false },
    });
    const res = await executeAgentTool("list_external_calendar_events", "{}", {
      conversationId: "c1",
      messageId: "m1",
    });
    expect(res.output).toContain("deaktiviert");
  });

  it("list_pending_proposals returns empty array when none", async () => {
    const res = await executeAgentTool("list_pending_proposals", "{}", {
      conversationId: "c1",
      messageId: "m1",
    });
    const parsed = JSON.parse(res.output) as { proposals: unknown[] };
    expect(Array.isArray(parsed.proposals)).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { clearConversationChat } from "@/server/chat/clear-conversation";
import { proposeAction } from "@/server/actions/propose";

beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.actionProposal.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.task.deleteMany();
});

describe("clearConversationChat", () => {
  it("deletes messages but keeps tasks and rejects open proposals", async () => {
    const conv = await prisma.conversation.create({ data: { title: "Test" } });
    await prisma.message.createMany({
      data: [
        { conversationId: conv.id, role: "user", content: "hi" },
        { conversationId: conv.id, role: "assistant", content: "hello" },
      ],
    });
    await proposeAction({
      conversationId: conv.id,
      triggerMessageId: `clear-test-${Math.random().toString(36).slice(2)}`,
      payload: {
        actionType: "create_task",
        data: { title: `ClearChatTestTask-${Date.now()}` },
      },
      summary: "s",
      affectedData: "a",
    });
    const keepTitle = `Bleibt-${Date.now()}`;
    await prisma.task.create({ data: { title: keepTitle, status: "open" } });

    const result = await clearConversationChat(conv.id);
    expect(result.messagesDeleted).toBe(2);
    expect(result.proposalsRejected).toBe(1);

    expect(await prisma.message.count({ where: { conversationId: conv.id } })).toBe(0);
    expect(await prisma.task.count({ where: { title: keepTitle } })).toBe(1);
    const proposal = await prisma.actionProposal.findFirst({ where: { conversationId: conv.id } });
    expect(proposal?.status).toBe("rejected");
  });
});

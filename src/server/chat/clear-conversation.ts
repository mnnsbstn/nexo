import { prisma } from "@/lib/db";

export type ClearChatResult = {
  messagesDeleted: number;
  proposalsRejected: number;
};

/** Removes chat messages; keeps tasks, memories, and completed action history. */
export async function clearConversationChat(conversationId: string): Promise<ClearChatResult> {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) {
    throw new Error("Konversation nicht gefunden.");
  }

  const rejected = await prisma.actionProposal.updateMany({
    where: {
      conversationId,
      status: { in: ["awaiting_confirmation", "proposed", "executing"] },
    },
    data: { status: "rejected" },
  });

  const deleted = await prisma.message.deleteMany({ where: { conversationId } });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return {
    messagesDeleted: deleted.count,
    proposalsRejected: rejected.count,
  };
}

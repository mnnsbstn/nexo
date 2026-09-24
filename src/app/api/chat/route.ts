import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getOrCreateDefaultConversation,
  handleChatMessage,
} from "@/server/agent/orchestrator";
import { serializeMessage, serializeProposal } from "@/lib/serialize";

const postSchema = z.object({
  content: z.string().min(1).max(8000),
  conversationId: z.string().optional(),
});

export async function GET() {
  const conv = await getOrCreateDefaultConversation();
  const messages = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
  });
  const pending = await prisma.actionProposal.findMany({
    where: {
      conversationId: conv.id,
      status: { in: ["awaiting_confirmation", "executing"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    conversationId: conv.id,
    messages: messages.map(serializeMessage),
    pendingProposals: pending.map(serializeProposal),
  });
}

export async function POST(req: Request) {
  const body = postSchema.parse(await req.json());
  const conv = body.conversationId
    ? await prisma.conversation.findUnique({ where: { id: body.conversationId } })
    : await getOrCreateDefaultConversation();
  if (!conv) {
    return NextResponse.json({ error: "Konversation nicht gefunden" }, { status: 404 });
  }

  const result = await handleChatMessage(conv.id, body.content);
  return NextResponse.json({
    conversationId: conv.id,
    userMessage: serializeMessage(result.userMsg),
    assistantMessage: serializeMessage(result.assistantMsg),
    proposals: result.proposals.map(serializeProposal),
    mode: result.mode,
    liveMeta: result.liveMeta,
    error: "error" in result ? result.error : undefined,
  });
}

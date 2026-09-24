import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultConversation } from "@/server/agent/orchestrator";
import { clearConversationChat } from "@/server/chat/clear-conversation";

const bodySchema = z.object({
  conversationId: z.string().optional(),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Bestätigung erforderlich (confirm: true)." }),
  }),
});

export async function POST(req: Request) {
  const body = bodySchema.parse(await req.json());
  const conv = body.conversationId
    ? await prisma.conversation.findUnique({ where: { id: body.conversationId } })
    : await getOrCreateDefaultConversation();

  if (!conv) {
    return NextResponse.json({ error: "Konversation nicht gefunden" }, { status: 404 });
  }

  const result = await clearConversationChat(conv.id);

  return NextResponse.json({
    ok: true,
    conversationId: conv.id,
    ...result,
    preserved: {
      tasks: true,
      memories: true,
      completedActions: true,
    },
  });
}

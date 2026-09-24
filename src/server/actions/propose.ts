import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import {
  actionPayloadSchema,
  type ActionPayload,
} from "@/server/schemas/actions";

export type ProposeActionInput = {
  conversationId?: string;
  triggerMessageId?: string;
  payload: ActionPayload;
  summary: string;
  affectedData: string;
  scope?: "local" | "external";
};

function stablePayloadHash(payload: ActionPayload): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 24);
}

export async function proposeAction(input: ProposeActionInput) {
  const parsed = actionPayloadSchema.parse(input.payload);
  const idempotencyKey = `${parsed.actionType}:${stablePayloadHash(parsed)}:${input.triggerMessageId ?? "none"}`;

  const existing = await prisma.actionProposal.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return existing;
  }

  return prisma.actionProposal.create({
    data: {
      conversationId: input.conversationId,
      triggerMessageId: input.triggerMessageId,
      actionType: parsed.actionType,
      payload: JSON.stringify(parsed),
      summary: input.summary,
      affectedData: input.affectedData,
      scope: input.scope ?? "local",
      status: "awaiting_confirmation",
      idempotencyKey,
    },
  });
}

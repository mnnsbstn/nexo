import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { serializeProposal } from "@/lib/serialize";
import { statusesForFilter, type ActionFilter } from "@/lib/action-labels";

const querySchema = z.object({
  filter: z.enum(["all", "open", "done", "failed"]).default("all"),
  limit: z.coerce.number().min(1).max(100).default(30),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { filter, limit } = querySchema.parse({
    filter: searchParams.get("filter") ?? "all",
    limit: searchParams.get("limit") ?? "30",
  });

  const statuses = statusesForFilter(filter as ActionFilter);
  const actions = await prisma.actionProposal.findMany({
    where: statuses ? { status: { in: statuses } } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ actions: actions.map(serializeProposal), filter, limit });
}

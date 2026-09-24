import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeProposal } from "@/lib/serialize";

export async function GET() {
  const actions = await prisma.actionProposal.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ actions: actions.map(serializeProposal) });
}

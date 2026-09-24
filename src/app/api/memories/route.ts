import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeMemory } from "@/lib/serialize";
import { createMemoryPayloadSchema } from "@/server/schemas/actions";
import { searchMemories } from "@/server/tools/read";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const memories = q ? await searchMemories(q) : await prisma.memory.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ memories: memories.map(serializeMemory) });
}

export async function POST(req: Request) {
  const data = createMemoryPayloadSchema.parse(await req.json());
  if (/\b(passwort|password|api key|secret)\b/i.test(data.content)) {
    return NextResponse.json(
      { error: "Keine Secrets als Erinnerung speicherbar." },
      { status: 400 },
    );
  }
  const memory = await prisma.memory.create({
    data: {
      content: data.content,
      category: data.category,
      source: "manual",
    },
  });
  return NextResponse.json({ memory: serializeMemory(memory) });
}

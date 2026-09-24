import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeMemory } from "@/lib/serialize";
import { updateMemoryPayloadSchema } from "@/server/schemas/actions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = updateMemoryPayloadSchema.parse({ ...(await req.json()), memoryId: id });
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }
  const memory = await prisma.memory.update({
    where: { id },
    data: { content: body.content, category: body.category ?? existing.category },
  });
  return NextResponse.json({ memory: serializeMemory(memory) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  await prisma.memory.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}

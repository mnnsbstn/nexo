import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { updateMemoryPayloadSchema } from "@/server/schemas/actions";
import { MemoryConflictError, updateMemoryRecord } from "@/server/memory/save";

type Params = { params: Promise<{ id: string }> };

const patchSchema = updateMemoryPayloadSchema.extend({
  acknowledgeConflicts: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = patchSchema.parse({ ...(await req.json()), memoryId: id });
    const memory = await updateMemoryRecord({
      id,
      content: body.content,
      category: body.category,
      acknowledgeConflicts: body.acknowledgeConflicts,
    });
    return NextResponse.json({ memory });
  } catch (err) {
    if (err instanceof MemoryConflictError) {
      return NextResponse.json(
        {
          error: "conflicts",
          message:
            "Die Änderung könnte einer bestehenden Erinnerung widersprechen. Beide können parallel existieren — bitte bestätigen.",
          conflicts: err.conflicts,
        },
        { status: 409 },
      );
    }
    const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen";
    const status = message === "Nicht gefunden" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  await prisma.memory.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}

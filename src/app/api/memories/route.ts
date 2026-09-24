import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { serializeMemory } from "@/lib/serialize";
import { createMemoryPayloadSchema } from "@/server/schemas/actions";
import { searchMemories } from "@/server/tools/read";
import { createMemoryRecord, MemoryConflictError } from "@/server/memory/save";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const memories = q
    ? await searchMemories(q)
    : await prisma.memory.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
      });
  return NextResponse.json({ memories: memories.map(serializeMemory) });
}

const postSchema = createMemoryPayloadSchema.extend({
  acknowledgeConflicts: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const data = postSchema.parse(await req.json());
    const memory = await createMemoryRecord({
      content: data.content,
      category: data.category,
      source: "manual",
      acknowledgeConflicts: data.acknowledgeConflicts,
    });
    return NextResponse.json({ memory });
  } catch (err) {
    if (err instanceof MemoryConflictError) {
      return NextResponse.json(
        {
          error: "conflicts",
          message:
            "Es gibt bereits ähnliche Erinnerungen. Nexo überschreibt nichts still — bitte prüfen und bestätigen.",
          conflicts: err.conflicts,
        },
        { status: 409 },
      );
    }
    const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { serializeTask } from "@/lib/serialize";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["open", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const data = patchSchema.parse(await req.json());
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description === undefined ? undefined : data.description,
      status: data.status,
      priority: data.priority === undefined ? undefined : data.priority,
      dueDate: data.dueDate === undefined ? undefined : data.dueDate,
      dueAt:
        data.dueAt === undefined ? undefined : data.dueAt ? new Date(data.dueAt) : null,
    },
  });
  return NextResponse.json({ task: serializeTask(task) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

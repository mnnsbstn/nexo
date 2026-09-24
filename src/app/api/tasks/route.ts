import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeTask } from "@/lib/serialize";
import { createTaskPayloadSchema } from "@/server/schemas/actions";

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ tasks: tasks.map(serializeTask) });
}

const postSchema = createTaskPayloadSchema;

export async function POST(req: Request) {
  const data = postSchema.parse(await req.json());
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority ?? null,
      dueDate: data.dueDate ?? null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      status: "open",
    },
  });
  return NextResponse.json({ task: serializeTask(task) });
}

import { prisma } from "@/lib/db";
import { serializeMemory } from "@/lib/serialize";
import { findMemoryConflicts } from "@/server/memory/conflicts";

export class MemoryConflictError extends Error {
  conflicts: ReturnType<typeof serializeMemory>[];

  constructor(conflicts: ReturnType<typeof serializeMemory>[]) {
    super("Mögliche widersprüchliche Erinnerungen gefunden.");
    this.conflicts = conflicts;
  }
}

export async function createMemoryRecord(input: {
  content: string;
  category: string;
  source: string;
  acknowledgeConflicts?: boolean;
  excludeConflictCheck?: boolean;
}) {
  if (/\b(passwort|password|api key|secret)\b/i.test(input.content)) {
    throw new Error("Keine Secrets als Erinnerung speicherbar.");
  }

  if (!input.excludeConflictCheck) {
    const conflicts = await findMemoryConflicts(input.content, input.category);
    if (conflicts.length > 0 && !input.acknowledgeConflicts) {
      throw new MemoryConflictError(conflicts.map(serializeMemory));
    }
  }

  const memory = await prisma.memory.create({
    data: {
      content: input.content,
      category: input.category,
      source: input.source,
    },
  });
  return serializeMemory(memory);
}

export async function updateMemoryRecord(input: {
  id: string;
  content: string;
  category?: string;
  acknowledgeConflicts?: boolean;
}) {
  if (/\b(passwort|password|api key|secret)\b/i.test(input.content)) {
    throw new Error("Keine Secrets als Erinnerung speicherbar.");
  }

  const existing = await prisma.memory.findUnique({ where: { id: input.id } });
  if (!existing || !existing.isActive) {
    throw new Error("Nicht gefunden");
  }

  const category = input.category ?? existing.category;
  const conflicts = await findMemoryConflicts(input.content, category, input.id);
  if (conflicts.length > 0 && !input.acknowledgeConflicts) {
    throw new MemoryConflictError(conflicts.map(serializeMemory));
  }

  const memory = await prisma.memory.update({
    where: { id: input.id },
    data: { content: input.content, category },
  });
  return serializeMemory(memory);
}

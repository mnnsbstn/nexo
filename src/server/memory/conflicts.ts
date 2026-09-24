import { prisma } from "@/lib/db";
import type { Memory } from "@prisma/client";

const STOP_WORDS = new Set([
  "dass",
  "deine",
  "dein",
  "eine",
  "einer",
  "einem",
  "einen",
  "ich",
  "nicht",
  "oder",
  "schon",
  "sehr",
  "wenn",
  "wird",
  "habe",
  "merke",
  "bitte",
]);

export function tokenizeMemoryContent(content: string): Set<string> {
  const matches = content.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  return new Set(matches.filter((t) => !STOP_WORDS.has(t)));
}

export function memoryContentOverlap(a: string, b: string): number {
  const ta = tokenizeMemoryContent(a);
  const tb = tokenizeMemoryContent(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared++;
  }
  return shared;
}

/** Finds active memories that may contradict or overlap — never auto-resolves. */
export async function findMemoryConflicts(
  content: string,
  category: string,
  excludeId?: string,
): Promise<Memory[]> {
  const peers = await prisma.memory.findMany({
    where: {
      isActive: true,
      category,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return peers.filter((m) => {
    const overlap = memoryContentOverlap(content, m.content);
    if (overlap >= 2) return true;
    if (category === "preference" && m.content.trim() !== content.trim()) {
      return overlap >= 1;
    }
    return false;
  });
}

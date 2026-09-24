import type { ActionProposal, Message, Task, Memory } from "@prisma/client";

export function serializeProposal(p: ActionProposal) {
  let payload: unknown = null;
  try {
    payload = JSON.parse(p.payload);
  } catch {
    payload = p.payload;
  }
  return {
    id: p.id,
    actionType: p.actionType,
    summary: p.summary,
    affectedData: p.affectedData,
    scope: p.scope,
    status: p.status,
    payload,
    errorMessage: p.errorMessage,
    createdAt: p.createdAt.toISOString(),
    executedAt: p.executedAt?.toISOString() ?? null,
  };
}

export function serializeMessage(m: Message) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    metadata: m.metadata ? JSON.parse(m.metadata) : null,
    createdAt: m.createdAt.toISOString(),
  };
}

export function serializeTask(t: Task) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    dueAt: t.dueAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function serializeMemory(m: Memory) {
  return {
    id: m.id,
    content: m.content,
    category: m.category,
    source: m.source,
    sourceDetail: m.sourceDetail,
    isActive: m.isActive,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

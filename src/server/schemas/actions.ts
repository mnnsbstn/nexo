import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high"]).optional();

export const createTaskPayloadSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: taskPrioritySchema,
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dueAt: z.string().datetime().optional(),
});

export const updateTaskPayloadSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["open", "done"]).optional(),
  priority: taskPrioritySchema.nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

export const deleteTaskPayloadSchema = z.object({
  taskId: z.string().min(1),
});

export const createMemoryPayloadSchema = z.object({
  content: z.string().min(1).max(5000),
  category: z.enum(["preference", "workflow", "note"]).default("note"),
});

export const updateMemoryPayloadSchema = z.object({
  memoryId: z.string().min(1),
  content: z.string().min(1).max(5000),
  category: z.enum(["preference", "workflow", "note"]).optional(),
});

export const deleteMemoryPayloadSchema = z.object({
  memoryId: z.string().min(1),
});

export const actionTypeSchema = z.enum([
  "create_task",
  "update_task",
  "delete_task",
  "create_memory",
  "update_memory",
  "delete_memory",
]);

export type ActionType = z.infer<typeof actionTypeSchema>;

export const actionPayloadSchema = z.discriminatedUnion("actionType", [
  z.object({ actionType: z.literal("create_task"), data: createTaskPayloadSchema }),
  z.object({ actionType: z.literal("update_task"), data: updateTaskPayloadSchema }),
  z.object({ actionType: z.literal("delete_task"), data: deleteTaskPayloadSchema }),
  z.object({ actionType: z.literal("create_memory"), data: createMemoryPayloadSchema }),
  z.object({ actionType: z.literal("update_memory"), data: updateMemoryPayloadSchema }),
  z.object({ actionType: z.literal("delete_memory"), data: deleteMemoryPayloadSchema }),
]);

export type ActionPayload = z.infer<typeof actionPayloadSchema>;

export const proposalStatusSchema = z.enum([
  "proposed",
  "awaiting_confirmation",
  "executing",
  "succeeded",
  "failed",
  "rejected",
]);

export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

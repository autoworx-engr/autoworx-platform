"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getEssentials } from "@/lib/auth-utils";
import { ServerAction } from "@/types/action";
import { Priority } from "@prisma/client";

const UpdateTaskSchema = z.object({
  taskId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  date: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  assignedUsers: z.array(z.number().int().positive()).optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export async function updateTask(
  input: UpdateTaskInput,
  options?: { forceCompanyId?: number; forceUserId?: number },
): Promise<ServerAction> {
  try {
    const parsed = UpdateTaskSchema.parse(input);

    let companyId: number;
    if (options?.forceCompanyId) {
      companyId = options.forceCompanyId;
    } else {
      const essentials = await getEssentials();
      companyId = essentials.companyId;
    }

    const existing = await db.task.findFirst({
      where: { id: parsed.taskId, companyId },
      select: { id: true },
    });
    if (!existing) {
      return { type: "error", message: "Task not found" };
    }

    const { taskId, assignedUsers, date, ...rest } = parsed;

    await db.task.update({
      where: { id: taskId, companyId },
      data: {
        ...rest,
        date: date ? new Date(date) : date === null ? null : undefined,
      },
    });

    if (assignedUsers !== undefined) {
      await db.taskUser.deleteMany({ where: { taskId } });
      if (assignedUsers.length > 0) {
        await db.taskUser.createMany({
          data: assignedUsers.map((uid) => ({
            taskId,
            userId: uid,
            eventId: null,
          })),
        });
      }
    }

    return { type: "success", message: "Task updated", data: { taskId } };
  } catch (error) {
    console.error("[updateTask] error:", error);
    return {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

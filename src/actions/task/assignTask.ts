"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";

export async function assignTask({
  userId,
  tasksToAssign,
}: {
  userId: number;
  tasksToAssign: {
    taskId: number;
    assigned: boolean;
  }[];
}): Promise<ServerAction> {
  const taskIds = tasksToAssign.map((t) => t.taskId);

  const [user, existingTaskUsers] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.taskUser.findMany({ where: { taskId: { in: taskIds }, userId } }),
  ]);

  if (!user) {
    return { type: "error" };
  }

  const assignedTaskIds = new Set(existingTaskUsers.map((tu) => tu.taskId));

  const toAdd = tasksToAssign
    .filter((t) => t.assigned && !assignedTaskIds.has(t.taskId))
    .map((t) => t.taskId);

  const toRemove = tasksToAssign
    .filter((t) => !t.assigned && assignedTaskIds.has(t.taskId))
    .map((t) => t.taskId);

  await db.$transaction([
    ...toAdd.map((taskId) =>
      db.taskUser.create({
        data: { userId, taskId, eventId: "null-for-now" },
      }),
    ),
    ...(toRemove.length > 0
      ? [
          db.taskUser.deleteMany({
            where: { taskId: { in: toRemove }, userId },
          }),
        ]
      : []),
  ]);

  return { type: "success" };
}

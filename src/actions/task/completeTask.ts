"use server";

import { db } from "@/lib/db";
import { sendTaskCompleteNotification } from "@/lib/notification/task-and-appointment-notify";
import { ServerAction } from "@/types/action";

export async function completeTask(
  id: number,
  _options?: { revalidate?: boolean },
): Promise<ServerAction> {
  try {
    const taskUsers = await db.taskUser.findMany({
      where: {
        taskId: id,
      },
    });

    const completedTask = await db.task.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    await sendTaskCompleteNotification({
      companyId: completedTask.companyId,
      taskDate: completedTask.date && completedTask.date,
      taskTitle: completedTask.title,
      assignTaskUserId: taskUsers.map((user) => user.userId),
    });

    return {
      type: "success",
    };
  } catch (error) {
    // console.log("🚀 ~ completeTask ~ error:", error);
    return {
      type: "error",
    };
  }
}

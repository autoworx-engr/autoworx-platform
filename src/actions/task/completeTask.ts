"use server";

import { db } from "@/lib/db";
import { sendTaskCompleteNotification } from "@/lib/notification/task-and-appointment-notify";
import { ServerAction } from "@/types/action";
import { deleteTask } from "./deleteTask";

export async function completeTask(id: number): Promise<ServerAction> {
  try {
    // find the task users
    const taskUsers = await db.taskUser.findMany({
      where: {
        taskId: id,
      },
    });

    // remove the task
    const deletedTask = await deleteTask(id);

    await sendTaskCompleteNotification({
      companyId: deletedTask.data.companyId,
      taskDate: deletedTask.data.date && deletedTask.data?.date,
      taskTitle: deletedTask.data?.title,
      assignTaskUserId: taskUsers.map((user) => user.userId),
    });

    return {
      type: "success",
    };
  } catch (error) {
    // console.log("🚀 ~ deleteTask ~ error:", error);
    return {
      type: "error",
    };
  }
}

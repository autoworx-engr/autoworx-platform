"use server";

import { getGoogleCalendarToken } from "@/app/(dashboard)/dashboard/task/[type]/components/appointment/googleCalendarAuth";
import { db } from "@/lib/db";
import { sendTaskCompleteNotification } from "@/lib/notification/task-and-appointment-notify";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";
import deleteGoogleCalendarEvent from "./google-calendar/deleteGoogleCalendarEvent";

export async function deleteTask(id: number): Promise<ServerAction> {
  try {
    // find the task users
    const taskUsers = await db.taskUser.findMany({
      where: {
        taskId: id,
      },
    });

    // remove the task users
    for (const user of taskUsers) {
      // TODO: Remove the task from the user's Google Calendar
    }

    // remove the task
    let deletedTask = await db.task.delete({
      where: {
        id,
      },
    });

    // delete task from google calendar

    try {
      let googleCalendarToken = (await getGoogleCalendarToken())
        ?.googleCalendarToken;

      if (googleCalendarToken && deletedTask.googleEventId) {
        await deleteGoogleCalendarEvent(deletedTask.googleEventId);
      }
    } catch (error) {
      console.log("🚀 ~ deleteTask ~ error:", error);
    }

    await sendTaskCompleteNotification({
      companyId: deletedTask.companyId,
      taskDate: deletedTask.date && deletedTask?.date,
      taskTitle: deletedTask?.title,
      assignTaskUserId: taskUsers.map((user) => user.userId),
    });

    revalidatePath("/task");
    revalidatePath("/communication/client");

    return {
      type: "success",
    };
  } catch (error) {
    console.log("🚀 ~ deleteTask ~ error:", error);
    return {
      type: "error",
    };
  }
}

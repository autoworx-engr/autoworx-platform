"use server";

import { db } from "@/lib/db";
import { sendTaskCompleteNotification } from "@/lib/notification/task-and-appointment-notify";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";
import deleteGoogleCalendarEvent from "./google-calendar/deleteGoogleCalendarEvent";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";

export async function deleteTask(id: number): Promise<ServerAction> {
  try {
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
      // console.log("🚀 ~ deleteTask ~ error:", error);
    }

    revalidatePath("/task");
    revalidatePath("/communication/client");

    return {
      type: "success",
      data: deletedTask,
    };
  } catch (error) {
    // console.log("🚀 ~ deleteTask ~ error:", error);
    return {
      type: "error",
    };
  }
}

"use server";

import { db } from "@/lib/db";
import { sendTaskCompleteNotification } from "@/lib/notification/task-and-appointment-notify";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";
import deleteGoogleCalendarEvent from "./google-calendar/deleteGoogleCalendarEvent";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";

export async function deleteTask(
  id: number,
  options?: { revalidate?: boolean },
): Promise<ServerAction> {
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

    // Skipping revalidation avoids an unnecessary refresh of the calling page
    // (e.g. the task calendar/sidebar, where the client already updates its
    // cache). It defaults to true so the communication/client page stays fresh.
    if (options?.revalidate !== false) {
      revalidatePath("/communication/client");
    }

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

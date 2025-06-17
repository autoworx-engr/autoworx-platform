"use server";

import { getGoogleCalendarToken } from "@/app/(dashboard)/dashboard/task/[type]/components/appointment/googleCalendarAuth";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";
import deleteGoogleCalendarEvent from "../task/google-calendar/deleteGoogleCalendarEvent";

export async function deleteAppointment(id: number): Promise<ServerAction> {
  try {
    const deletedAppointment = await db.appointment.delete({
      where: {
        id,
      },
    });

    revalidatePath("/task");

    // delete task from google calendar

    try {
      let googleCalendarToken = (await getGoogleCalendarToken())
        ?.googleCalendarToken;

      if (googleCalendarToken && deletedAppointment.googleEventId) {
        await deleteGoogleCalendarEvent(deletedAppointment.googleEventId);
      }
    } catch (error) {
      console.log("🚀 ~ deleteAppointment ~ error:", error);
    }

    return {
      type: "success",
    };
  } catch (error) {
    console.log("🚀 ~ deleteAppointment ~ error:", error);
    return {
      type: "error",
    };
  }
}

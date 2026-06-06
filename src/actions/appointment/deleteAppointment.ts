"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import deleteGoogleCalendarEvent from "../task/google-calendar/deleteGoogleCalendarEvent";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";
import { getPusherInstance } from "@/lib/pusher/server";
import axios from "axios";

export async function deleteAppointment(id: number): Promise<ServerAction> {
  try {
    const deletedAppointment = await db.appointment.delete({
      where: {
        id,
      },
    });

    // realtime: notify subscribers (e.g. Com hub client data section) so the
    // appointment list updates without a refresh
    try {
      if (deletedAppointment.clientId) {
        const pusher = getPusherInstance();
        await pusher.trigger(
          `appointment-${deletedAppointment.companyId}-${deletedAppointment.clientId}`,
          "appointment-deleted",
          { id: deletedAppointment.id },
        );
      }
    } catch (error) {
      console.log("🚀 ~ deleteAppointment ~ pusher error:", error);
    }

    try {
      await deleteRemindersInNest(deletedAppointment.id.toString());
    } catch (error) {
      console.log("🚀 ~ deleteAppointment ~ error:", error);
    }
    // revalidatePath("/task");

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

export async function deleteRemindersInNest(id: string) {
  try {
    console.log("🚀 ~ deleteRemindersInNest ~ start:");
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/reminder/delete`,
      { id },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    console.log("🚀 ~ deleteRemindersInNest ~ end:");
    return data;
  } catch (error) {
    console.log("🚀 ~ deleteRemindersInNest ~ end:");

    console.log("❌ error from deleteRemindersInNest", error);
  }
}

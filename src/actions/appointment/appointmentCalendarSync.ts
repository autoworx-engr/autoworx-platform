"use server";
import { db } from "@/lib/db";
import { TCreateAppointmentValidationSchema } from "@/validations/schemas/task/appointment.validation";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";
import createGoogleCalendarEvent from "../task/google-calendar/createGoogleCalendarEvent";

export async function syncAppointmentToGoogleCalendar(
  appointmentId: number,
  appointment: TCreateAppointmentValidationSchema,
): Promise<string | null> {
  try {
    const googleCalendarToken = (await getGoogleCalendarToken())
      ?.googleCalendarToken;

    if (
      !googleCalendarToken ||
      !appointment.startTime ||
      !appointment.endTime ||
      !appointment.date
    ) {
      return null;
    }

    const event = await createGoogleCalendarEvent(appointment);

    if (event?.id) {
      await db.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: event.id },
      });
      return event.id;
    }
  } catch (error) {
    console.log("🚀 ~ error:", error);
  }
  return null;
}

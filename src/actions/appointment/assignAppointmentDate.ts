"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import createGoogleCalendarEvent from "../task/google-calendar/createGoogleCalendarEvent";
import updateGoogleCalendarEvent from "../task/google-calendar/updateGoogleCalendarEvent";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";

/**
 * Assigns a date and time to an existing appointment.
 *
 * @param id - The ID of the appointment to update.
 * @param date - The new date for the appointment.
 * @param startTime - The new start time for the appointment.
 * @param endTime - The new end time for the appointment.
 * @param timezone - The timezone for the appointment.
 * @returns A promise that resolves to a ServerAction indicating the result.
 */
export async function assignAppointmentDate({
  id,
  date,
  startTime,
  endTime,
  timezone,
}: {
  id: number;
  date: Date | string;
  startTime: string;
  endTime: string;
  timezone: string;
}): Promise<ServerAction> {
  try {
    // Update the appointment in the database
    let updatedAppointment = await db.appointment.update({
      where: {
        id,
      },
      data: {
        date: new Date(date),
        startTime,
        endTime,
      },
      include: {
        appointmentUsers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
          },
        },
      },
    });

    // Revalidate the path to update the cache
    // revalidatePath("/task");

    // Check if Google Calendar token exists and update or create Google Calendar event
    try {
      let googleCalendarToken = (await getGoogleCalendarToken())
        ?.googleCalendarToken;

      if (
        googleCalendarToken &&
        updatedAppointment.googleEventId &&
        updatedAppointment.startTime &&
        updatedAppointment.endTime &&
        updatedAppointment.date &&
        updatedAppointment.title
      ) {
        let appointmentForGoogleCalendar = {
          title: updatedAppointment.title,
          startTime: updatedAppointment.startTime,
          endTime: updatedAppointment.endTime,
          date: new Date(updatedAppointment.date).toISOString(),
          assignedUsers: [],
          timezone,
        };

        await updateGoogleCalendarEvent(
          updatedAppointment.googleEventId,
          appointmentForGoogleCalendar,
        );
      } else if (
        googleCalendarToken &&
        !updatedAppointment.googleEventId &&
        updatedAppointment.startTime &&
        updatedAppointment.endTime &&
        updatedAppointment.date &&
        updatedAppointment.title
      ) {
        let appointmentForGoogleCalendar = {
          title: updatedAppointment.title,
          startTime: updatedAppointment.startTime,
          endTime: updatedAppointment.endTime,
          date: new Date(updatedAppointment.date).toISOString(),
          assignedUsers: [],
          timezone,
        };

        let event = await createGoogleCalendarEvent(
          appointmentForGoogleCalendar,
        );

        // Save the event ID in the database if the event is successfully created in Google Calendar
        if (event && event.id) {
          updatedAppointment = await db.appointment.update({
            where: {
              id: updatedAppointment.id,
            },
            data: {
              googleEventId: event.id,
            },
            include: {
              appointmentUsers: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  mobile: true,
                },
              },
            },
          });
        }
      }
    } catch (error) {
      console.log("🚀 ~ error:", error);
    }
    // Return a success action
    return {
      type: "success",
      data: updatedAppointment,
    };
  } catch (error) {
    console.error("Error assigning appointment date:", error);

    // Return an error action
    // return {
    //   type: "error",
    // };
    throw error;
  }
}

"use server";
import { AppointmentToAdd } from "@/actions/appointment/addAppointment";
import { AppointmentToUpdate } from "@/actions/appointment/editAppointment";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { google } from "googleapis";
import moment from "moment-timezone"; // Use moment-timezone
import { TaskType } from "../createTask";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { getGoogleCalendarToken } from "@/actions/calendar-settings/getGoogleCalendarAuth";

async function createGoogleCalendarEvent(
  task: TaskType | AppointmentToAdd | AppointmentToUpdate,
) {
  if (!task.date) return;

  const refreshToken = (await getGoogleCalendarToken())?.googleCalendarToken;

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);

  if (refreshToken) {
    oAuth2Client.setCredentials({ refresh_token: refreshToken });
  }

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
  const { timezone: companyTimezone } = await getCompanyTimezone();

  // Get the user's local timezone (e.g., "Asia/Dhaka")
  const userTimeZone = companyTimezone || task.timezone || moment.tz.guess(); // Auto-detect timezone

  // Parse input date/time in LOCAL timezone
  // const startMoment = moment.tz(
  //   `${task.date.split("T")[0]} ${task.startTime}`,
  //   "YYYY-MM-DD HH:mm",
  //   userTimeZone, // Parse as local time
  // );

  // const endMoment = moment.tz(
  //   `${task.date.split("T")[0]} ${task.endTime}`,
  //   "YYYY-MM-DD HH:mm",
  //   userTimeZone, // Parse as local time
  // );
  const startMoment = moment
    .tz(
      `${task.date.split("T")[0]} ${task.startTime}`,
      userTimeZone, // Parse as local time
    )
    .utc();

  // Multi-day appointments: end time belongs to endDate; otherwise end time
  // shares the start date.
  const endDateString =
    "endDate" in task && task.endDate
      ? task.endDate.split("T")[0]
      : task.date.split("T")[0];

  const endMoment = moment
    .tz(
      `${endDateString} ${task.endTime}`,
      userTimeZone, // Parse as local time
    )
    .utc();

  const event = {
    summary: task.title,
    start: {
      dateTime: startMoment.format(), // ISO string with offset
      timeZone: "Etc/UTC", // Explicit timezone
    },
    end: {
      dateTime: endMoment.format(), // ISO string with offset
      timeZone: "Etc/UTC", // Explicit timezone
    },
    description:
      "description" in task && task.description ? task.description : undefined,
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.log("🚀 ~ error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      //@ts-ignore
      error?.response?.data?.error === "invalid_grant"
    ) {
      const companyId = await getCompanyId();

      await db.company.update({
        where: { id: companyId },
        data: {
          googleCalendarToken: null,
        },
      });
    }
    // console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}

export default createGoogleCalendarEvent;

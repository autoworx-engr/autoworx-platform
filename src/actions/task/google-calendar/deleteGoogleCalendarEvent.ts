import { getGoogleCalendarToken } from "@/actions/calendar-settings/getGoogleCalendarAuth";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { google } from "googleapis";

// Function to delete event in Google Calendar
async function deleteGoogleCalendarEvent(eventId: string) {
  const refreshToken = (await getGoogleCalendarToken())?.googleCalendarToken;

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);

  if (refreshToken)
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  try {
    await calendar.events.delete({
      auth: oAuth2Client,
      calendarId: "primary",
      eventId: eventId,
    });
  } catch (error) {
    //@ts-ignore
    if (error?.response?.data?.error === "invalid_grant") {
      const companyId = await getCompanyId();

      await db.company.update({
        where: { id: companyId },
        data: {
          googleCalendarToken: null,
        },
      });
    }
    console.error("Error deleting Google Calendar event:", error);
    throw error;
  }
}

export default deleteGoogleCalendarEvent;

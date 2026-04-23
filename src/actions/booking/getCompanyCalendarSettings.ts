"use server";

import { db } from "@/lib/db";

export async function getCompanyCalendarSettings(companyId: string) {
  try {
    const calendarSettings = await db.calendarSettings.findFirst({
      where: {
        companyId: parseInt(companyId),
      },
    });

    return calendarSettings;
  } catch (error) {
    console.error("Error fetching company calendar settings:", error);
    return null;
  }
}

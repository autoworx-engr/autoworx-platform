"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { getServerSession } from "next-auth";

export async function updateCalendarSettings(data: {
  weekStart: string;
  dayStart: string;
  dayEnd: string;
  weekend1: string;
  weekend2: string;
}): Promise<ServerAction> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  // Create or Update the calendar settings
  const newCalendarSettings = await db.calendarSettings.upsert({
    where: {
      companyId,
    },
    update: {
      weekStart: data.weekStart,
      dayStart: data.dayStart,
      dayEnd: data.dayEnd,
      weekend1: data.weekend1,
      weekend2: data.weekend2,
    },
    create: {
      companyId,
      weekStart: data.weekStart,
      dayStart: data.dayStart,
      dayEnd: data.dayEnd,
      weekend1: data.weekend1,
      weekend2: data.weekend2,
    },
  });

  return { type: "success", data: newCalendarSettings };
}

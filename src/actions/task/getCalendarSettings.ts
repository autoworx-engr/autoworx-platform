"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function getCalenderSettings(
  params?: Prisma.CalendarSettingsFindFirstArgs,
) {
  const { where, ...restParams } = params || {};
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      throw new Error("Company ID is required to fetch calendar settings.");
    }
    const calendarSettings = await db.calendarSettings.findFirst({
      where: {
        companyId,
        ...(where ?? {}),
      },
      ...restParams,
    });
    return calendarSettings;
  } catch (err: any) {
    throw new Error(`Error: ${err?.message ?? err}`);
  }
}

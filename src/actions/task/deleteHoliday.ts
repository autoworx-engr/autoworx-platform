"use server";

import { db } from "@/lib/db";

export async function deleteHoliday(holidayId: number) {
  try {
    const holiday = await db.holiday.delete({
      where: {
        id: holidayId,
      },
    });
    return {
      status: 200,
      data: holiday,
    };
  } catch (err: any) {
    throw new Error(`Failed to delete holiday: ${err?.message ?? err}`);
  }
}

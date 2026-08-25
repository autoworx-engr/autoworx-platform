"use server";

import { companyNow } from "@/lib/companyTime";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { revalidatePath } from "next/cache";

export async function clockOut({
  clockInOutId,
  timezone,
}: {
  clockInOutId: number;
  timezone?: string;
}) {
  try {
    const user = await getUser();
    const now = companyNow(timezone);
    const clockedOut = await db.clockInOut.update({
      where: {
        id: clockInOutId,
        userId: user.id,
        companyId: user.companyId,
      },
      data: {
        clockOut: now,
      },
      include: {
        ClockBreak: true,
      },
    });

    if (clockedOut.ClockBreak && clockedOut.ClockBreak.length > 0) {
      const lastIndex = clockedOut.ClockBreak.length - 1;
      const lastClockBreak = clockedOut.ClockBreak[lastIndex];

      if (lastClockBreak && !lastClockBreak.breakEnd) {
        await db.clockBreak.update({
          where: {
            id: lastClockBreak.id,
          },
          data: {
            breakEnd: now,
          },
        });
      }
    }

    revalidatePath("/");

    return { success: true, message: "Clocked Out", data: clockedOut };
  } catch (error) {
    return { success: false };
  }
}

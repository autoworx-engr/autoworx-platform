"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { revalidatePath } from "next/cache";
import moment from "moment-timezone";

export async function clockIn({ timezone }: { timezone: string }) {
  try {
    const user = await getUser();
    const clockedIn = await db.clockInOut.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        clockIn: new Date(),
        timezone,
      },
    });
    revalidatePath("/");

    return { success: true, message: "Clocked In", data: clockedIn };
  } catch (error) {
    return { success: false };
  }
}

export async function getLastClockInOutForUser({
  timezone,
}: {
  timezone: string;
}) {
  const user = await getUser();
  const lastClockInOut = await db.clockInOut.findFirst({
    where: {
      userId: user.id,
      companyId: user.companyId,
    },
    orderBy: {
      id: "desc",
    },
    include: {
      ClockBreak: true,
    },
    take: 1,
  });

  if (lastClockInOut) {
    const clockInDay = moment(lastClockInOut.clockIn).tz(
      lastClockInOut?.timezone || moment.tz.guess(),
    );

    const now = moment.tz(timezone);
    if (moment(clockInDay).isSame(now, "day")) {
      return lastClockInOut;
    } else {
      return null;
    }
  } else {
    return null;
  }
}

"use server";

import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import moment from "moment-timezone";
import { revalidatePath } from "next/cache";

export async function clockIn({ timezone }: { timezone: string }) {
  try {
    console.log("Clocking in with timezone:", timezone);
    const user = await getUser();
    console.log("User info:", user);
    const clockedIn = await db.clockInOut.create({
      data: {
        userId: user?.id,
        companyId: user?.companyId,
        clockIn: new Date(),
        timezone,
      },
    });
    console.log("Clock-in record created:", clockedIn);

    //  Automatically schedule the clock-out at 7:00 PM
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auto-clockout/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clockInOutId: clockedIn?.id,
            userId: user?.id,
            companyId: user?.companyId,
            clockIn: clockedIn?.clockIn,
            timezone,
          }),
        },
      );
    } catch (error) {
      console.error("Failed to schedule auto-clockout:", error);
    }

    revalidatePath("/dashboard");

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

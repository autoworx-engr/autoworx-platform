"use server";

import { companyNow } from "@/lib/companyTime";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { isHourlyEmployee } from "@/lib/employeeSalaryType";
import { sendDuplicateClockInNotification } from "@/lib/notification/workForce-notify";
import moment from "moment-timezone";
import { revalidatePath } from "next/cache";

export async function clockIn({ timezone }: { timezone: string }) {
  try {
    console.log("Clocking in with timezone:", timezone);
    const user = await getUser();
    console.log("User info:", user);

    if (!(await isHourlyEmployee(user.id, user.companyId))) {
      return {
        success: false,
        message: "Clock in is only available for hourly employees.",
      };
    }

    const now = companyNow(timezone);

    const dayStart = moment.tz(now, timezone).startOf("day").toDate();
    const dayEnd = moment.tz(now, timezone).endOf("day").toDate();

    const existingToday = await db.clockInOut.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
        clockIn: { gte: dayStart, lte: dayEnd },
      },
    });

    if (existingToday) {
      await sendDuplicateClockInNotification({
        companyId: user.companyId,
        employeeId: user.id,
        employeeName: `${user.firstName} ${user.lastName ?? ""}`.trim(),
      });

      return {
        success: false,
        requiresApproval: true,
        message:
          "You have already clocked in today. An admin has been notified to review and approve this request.",
      };
    }

    const clockedIn = await db.clockInOut.create({
      data: {
        userId: user?.id,
        companyId: user?.companyId,
        clockIn: now,
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

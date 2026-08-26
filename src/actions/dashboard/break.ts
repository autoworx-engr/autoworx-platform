"use server";

import { companyNow } from "@/lib/companyTime";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { revalidatePath } from "next/cache";
import { getLastClockInOutForUser } from "./clockIn";

export async function takeBreak({
  clockInOutId,
  timezone,
}: {
  clockInOutId: number;
  timezone?: string;
}) {
  try {
    await getUser();
    const now = companyNow(timezone);
    const clockedIn = await db.clockBreak.create({
      data: {
        clockInOutId,
        breakStart: now,
      },
    });
    revalidatePath("/");

    return { success: true, message: "Break Successfull", data: clockedIn };
  } catch (error) {
    return { success: false };
  }
}

export async function stopBreak({
  clockBreakId,
  timezone,
}: {
  clockBreakId: number;
  timezone?: string;
}) {
  try {
    await getUser();
    const now = companyNow(timezone);
    const breakStop = await db.clockBreak.update({
      where: {
        id: clockBreakId,
      },
      data: {
        breakEnd: now,
      },
    });
    revalidatePath("/");
    return { success: true, message: "Stopped Break", data: breakStop };
  } catch (error) {
    return { success: false };
  }
}

export async function getLastClockBreakForUser() {
  const lastClockInOut = await getLastClockInOutForUser({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  if (!lastClockInOut) return null;

  if (lastClockInOut?.ClockBreak?.length > 0) {
    return lastClockInOut.ClockBreak[lastClockInOut?.ClockBreak?.length - 1];
  } else {
    return null;
  }
}

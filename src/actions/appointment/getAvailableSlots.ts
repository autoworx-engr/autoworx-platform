// src/actions/appointment/getAvailableSlots.ts
"use server";

import { db } from "@/lib/db";
import moment from "moment";
import { DayOfWeek } from "@prisma/client";

const getDayOfWeekEnum = (date: Date): DayOfWeek => {
  const days: DayOfWeek[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[moment.utc(date).day()];
};

// 1. Get Available Slots For A Explicit Date
export async function getAvailableSlots(
  shopId: number,
  dateString: string,
  duration?: number,
) {
  try {
    const requestMoment = moment.utc(dateString);
    const selectedDate = requestMoment.toDate();

    const dayOfWeek = getDayOfWeekEnum(selectedDate);

    const shop = await db.shop.findUnique({
      where: {
        id: shopId,
      },
      select: {
        companyId: true,
      },
    });

    // Fetch shop settings (stacking Limit & intervals) and today's availability
    const shopSettings = await db.shopBookingSetting.findUnique({
      where: { shopId },
      include: {
        availabilities: { where: { dayOfWeek } },
      },
    });

    if (!shopSettings || shopSettings.availabilities.length === 0)
      return { success: false, error: "Settings not found." };
    const todayAvailability = shopSettings.availabilities[0];

    // If shop is closed today or times are missing
    if (
      !todayAvailability.isOpen ||
      !todayAvailability.startTime ||
      !todayAvailability.endTime
    ) {
      return { success: true, date: selectedDate, availableSlots: [] };
    }

    const intervalMinutes = shopSettings.slotInterval || 30;
    const stackingLimit = shopSettings.isStackingEnabled
      ? shopSettings.stackingLimit
      : 1;

    // Build the base slots array using moment
    const selectedDateStr = requestMoment.format("YYYY-MM-DD");
    let currentSlotTime = moment.utc(
      `${selectedDateStr} ${todayAvailability.startTime}`,
      "YYYY-MM-DD HH:mm",
    );
    const endSlotTime = moment.utc(
      `${selectedDateStr} ${todayAvailability.endTime}`,
      "YYYY-MM-DD HH:mm",
    );

    const baseSlots: string[] = [];
    // Compare time strictly - assuming server matches shop location
    const now = moment(); // Keep current time check as local or whatever was expected
    // isToday check should ideally not cross timezone boundaries maliciously, but requestMoment is UTC midnight.
    // If we want to check if dateString is today locally:
    const isToday =
      requestMoment.format("YYYY-MM-DD") === now.format("YYYY-MM-DD");

    while (currentSlotTime.isBefore(endSlotTime)) {
      // Don't show past slots if booking for today
      if (
        !isToday ||
        currentSlotTime.isAfter(
          moment.utc(now.format("YYYY-MM-DD HH:mm"), "YYYY-MM-DD HH:mm"),
        )
      ) {
        baseSlots.push(currentSlotTime.format("HH:mm"));
      }
      currentSlotTime.add(intervalMinutes, "minutes");
    }

    // Fetch existing appointments on this date
    const startOfSelectedDay = requestMoment.clone().startOf("day").toDate();
    const startOfNextDay = requestMoment
      .clone()
      .add(1, "days")
      .startOf("day")
      .toDate();

    const existingAppointments = await db.appointment.findMany({
      where: {
        companyId: shop?.companyId,
        date: {
          gte: startOfSelectedDay,
          lt: startOfNextDay,
        },
      },
      select: { startTime: true, endTime: true },
    });

    const activeHolds = await db.shopSlotHold.findMany({
      where: {
        shopId: shopId,
        date: {
          gte: startOfSelectedDay,
          lt: startOfNextDay,
        },
        expiresAt: { gt: new Date() },
      },
      select: { startTime: true, endTime: true },
    });

    // Check stacking
    const effectiveDuration =
      duration && duration > 0 ? duration : intervalMinutes;
    const availableSlots = baseSlots.filter((slotTime) => {
      const slotMoment = moment.utc(
        `${selectedDateStr} ${slotTime}`,
        "YYYY-MM-DD HH:mm",
      );
      const slotEndMoment = slotMoment
        .clone()
        .add(effectiveDuration, "minutes");

      const appointmentsInSlot = existingAppointments.filter((app) => {
        if (!app.startTime || !app.endTime) return false;
        const appStartMoment = moment.utc(
          `${selectedDateStr} ${app.startTime}`,
          "YYYY-MM-DD HH:mm",
        );
        const appEndMoment = moment.utc(
          `${selectedDateStr} ${app.endTime}`,
          "YYYY-MM-DD HH:mm",
        );

        return (
          slotEndMoment.isAfter(appStartMoment) &&
          slotMoment.isBefore(appEndMoment)
        );
      });

      const holdsInSlot = activeHolds.filter((hold) => {
        if (!hold.startTime || !hold.endTime) return false;
        const holdStartMoment = moment.utc(
          `${selectedDateStr} ${hold.startTime}`,
          "YYYY-MM-DD HH:mm",
        );
        const holdEndMoment = moment.utc(
          `${selectedDateStr} ${hold.endTime}`,
          "YYYY-MM-DD HH:mm",
        );

        return (
          slotEndMoment.isAfter(holdStartMoment) &&
          slotMoment.isBefore(holdEndMoment)
        );
      });

      return appointmentsInSlot.length + holdsInSlot.length < stackingLimit;
    });

    return { success: true, date: selectedDate, availableSlots };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Next Available Feature logic
export async function getNextAvailableAppointment(
  shopId: number,
  duration?: number,
) {
  const maxSearchDays = 30; // Search up to 30 days ahead

  for (let i = 0; i < maxSearchDays; i++) {
    const checkDate = moment().add(i, "days");
    const result = await getAvailableSlots(
      shopId,
      checkDate.toISOString(),
      duration,
    );

    if (
      result.success &&
      result.availableSlots &&
      result.availableSlots.length > 0
    ) {
      return {
        success: true,
        date: checkDate.toDate(),
        availableSlots: result.availableSlots,
      };
    }
  }

  return { success: false, error: "No available appointments." };
}

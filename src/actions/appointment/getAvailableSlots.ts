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
  return days[moment(date).day()];
};

// 1. Get Available Slots For A Explicit Date
export async function getAvailableSlots(shopId: number, dateString: string) {
  try {
    const selectedDate = moment(dateString).toDate();
    const dayOfWeek = getDayOfWeekEnum(selectedDate);

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
    const selectedDateStr = moment(selectedDate).format("YYYY-MM-DD");
    let currentSlotTime = moment(
      `${selectedDateStr} ${todayAvailability.startTime}`,
      "YYYY-MM-DD HH:mm",
    );
    const endSlotTime = moment(
      `${selectedDateStr} ${todayAvailability.endTime}`,
      "YYYY-MM-DD HH:mm",
    );

    const baseSlots: string[] = [];
    const now = moment();
    const isToday = moment(selectedDate).isSame(now, "day");

    while (currentSlotTime.isBefore(endSlotTime)) {
      // Don't show past slots if booking for today
      if (!isToday || currentSlotTime.isAfter(now)) {
        baseSlots.push(currentSlotTime.format("HH:mm"));
      }
      currentSlotTime.add(intervalMinutes, "minutes");
    }

    // Fetch existing appointments on this date
    const startOfSelectedDay = moment(selectedDate).startOf("day").toDate();
    const startOfNextDay = moment(selectedDate)
      .add(1, "days")
      .startOf("day")
      .toDate();

    const existingAppointments = await db.appointment.findMany({
      where: {
        companyId: shopId,
        date: {
          gte: startOfSelectedDay,
          lt: startOfNextDay,
        },
      },
      select: { startTime: true },
    });

    // Check stacking
    const availableSlots = baseSlots.filter(slotTime => {
      const appointmentsInSlot = existingAppointments.filter(
        app => app.startTime === slotTime,
      );
      return appointmentsInSlot.length < stackingLimit;
    });

    return { success: true, date: selectedDate, availableSlots };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Next Available Feature logic
export async function getNextAvailableAppointment(shopId: number) {
  const maxSearchDays = 30; // Search up to 30 days ahead

  for (let i = 0; i < maxSearchDays; i++) {
    const checkDate = moment().add(i, "days");
    const result = await getAvailableSlots(shopId, checkDate.toISOString());

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

// src/actions/appointment/getAvailableSlots.ts
"use server";

import { db } from "@/lib/db";
import moment from "moment-timezone";
type DayOfWeek =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

const getDayOfWeekEnum = (dateStr: string, timezone: string): DayOfWeek => {
  const days: DayOfWeek[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[moment.tz(dateStr, "YYYY-MM-DD", timezone).day()];
};

// 1. Get Available Slots For A Explicit Date
export async function getAvailableSlots(
  shopId: number,
  dateString: string,
  duration?: number,
) {
  try {
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: {
        companyId: true,
        company: { select: { timezone: true } },
      },
    });

    const timezone = shop?.company?.timezone || "UTC";

    // Parse the selected date in the company's timezone.
    // Use an explicit format so a bare "YYYY-MM-DD" is anchored to the shop
    // timezone instead of moment's loose ISO/Date fallback (DST/offset safe).
    const requestMoment = moment.tz(dateString, "YYYY-MM-DD", timezone);
    const selectedDateStr = requestMoment.format("YYYY-MM-DD");
    const dayOfWeek = getDayOfWeekEnum(selectedDateStr, timezone);

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
      return {
        success: true,
        date: requestMoment.toDate(),
        slots: [],
      };
    }

    const intervalMinutes = shopSettings.slotInterval || 30;
    const stackingLimit = shopSettings.isStackingEnabled
      ? shopSettings.stackingLimit
      : 1;

    // Build slots in the company's timezone
    let currentSlotTime = moment.tz(
      `${selectedDateStr} ${todayAvailability.startTime}`,
      "YYYY-MM-DD HH:mm",
      timezone,
    );
    const endSlotTime = moment.tz(
      `${selectedDateStr} ${todayAvailability.endTime}`,
      "YYYY-MM-DD HH:mm",
      timezone,
    );

    const now = moment.tz(timezone);
    const isToday = selectedDateStr === now.format("YYYY-MM-DD");

    const baseSlots: string[] = [];
    while (currentSlotTime.isBefore(endSlotTime)) {
      if (!isToday || currentSlotTime.isAfter(now)) {
        baseSlots.push(currentSlotTime.format("HH:mm"));
      }
      currentSlotTime.add(intervalMinutes, "minutes");
    }

    // Appointments / holds are stored as UTC-midnight day anchors with
    // wall-clock startTime/endTime strings. Anchor day boundaries to UTC
    // midnight so the query matches stored rows. MUST stay consistent with
    // the hold route (service-booking/hold) or the UI and the reservation
    // check disagree about which slots are taken.
    const startOfSelectedDay = new Date(`${selectedDateStr}T00:00:00.000Z`);
    const startOfNextDay = new Date(
      startOfSelectedDay.getTime() + 24 * 60 * 60 * 1000,
    );

    const existingAppointments = await db.appointment.findMany({
      where: {
        companyId: shop?.companyId,
        AND: [
          { date: { lt: startOfNextDay } },
          {
            OR: [
              { endDate: { gte: startOfSelectedDay } },
              {
                endDate: null,
                date: { gte: startOfSelectedDay },
              },
            ],
          },
        ],
      },
      select: { date: true, endDate: true, startTime: true, endTime: true },
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

    const effectiveDuration =
      duration && duration > 0 ? duration : intervalMinutes;

    const slots = baseSlots.map((slotTime) => {
      const slotMoment = moment.tz(
        `${selectedDateStr} ${slotTime}`,
        "YYYY-MM-DD HH:mm",
        timezone,
      );
      const slotEndMoment = slotMoment
        .clone()
        .add(effectiveDuration, "minutes");

      // Disable slot if service duration would exceed closing time
      if (slotEndMoment.isAfter(endSlotTime)) {
        return { time: slotTime, available: false };
      }

      const appointmentsInSlot = existingAppointments.filter((app) => {
        if (!app.startTime || !app.endTime || !app.date) return false;
        // Read the stored calendar day in UTC (matches how date is persisted)
        // so the wall-clock startTime/endTime line up with the slot's day.
        const startDateStr = moment.utc(app.date).format("YYYY-MM-DD");
        const endAnchorDate = app.endDate ?? app.date;
        const endDateStr = moment.utc(endAnchorDate).format("YYYY-MM-DD");

        const appStartMoment = moment.tz(
          `${startDateStr} ${app.startTime}`,
          "YYYY-MM-DD HH:mm",
          timezone,
        );
        const appEndMoment = moment.tz(
          `${endDateStr} ${app.endTime}`,
          "YYYY-MM-DD HH:mm",
          timezone,
        );

        return (
          slotEndMoment.isAfter(appStartMoment) &&
          slotMoment.isBefore(appEndMoment)
        );
      });

      const holdsInSlot = activeHolds.filter((hold) => {
        if (!hold.startTime || !hold.endTime) return false;
        const holdStartMoment = moment.tz(
          `${selectedDateStr} ${hold.startTime}`,
          "YYYY-MM-DD HH:mm",
          timezone,
        );
        const holdEndMoment = moment.tz(
          `${selectedDateStr} ${hold.endTime}`,
          "YYYY-MM-DD HH:mm",
          timezone,
        );

        return (
          slotEndMoment.isAfter(holdStartMoment) &&
          slotMoment.isBefore(holdEndMoment)
        );
      });

      const available =
        appointmentsInSlot.length + holdsInSlot.length < stackingLimit;
      return { time: slotTime, available };
    });

    return { success: true, date: requestMoment.toDate(), slots };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Next Available Feature logic
export async function getNextAvailableAppointment(
  shopId: number,
  duration?: number,
) {
  const maxSearchDays = 30;

  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: { company: { select: { timezone: true } } },
  });
  const timezone = shop?.company?.timezone || "UTC";

  for (let i = 0; i < maxSearchDays; i++) {
    const checkDateStr = moment
      .tz(timezone)
      .add(i, "days")
      .format("YYYY-MM-DD");
    const result = await getAvailableSlots(shopId, checkDateStr, duration);

    if (
      result.success &&
      result.slots &&
      result.slots.some((s) => s.available)
    ) {
      return {
        success: true,
        date: moment.tz(checkDateStr, "YYYY-MM-DD", timezone).toDate(),
        slots: result.slots,
      };
    }
  }

  return { success: false, error: "No available appointments." };
}

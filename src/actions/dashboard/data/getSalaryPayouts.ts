"use server";

import { getDateRanges } from "@/actions/dashboard/data/lib";
import { db } from "@/lib/db";
import { getEssentials } from "@/lib/auth-utils";
import {
  calculateSalaryCurrentMonthEarnings,
  calculateSalaryPreviousMonthEarnings,
  calculateSalaryTotalEarnings,
} from "@/lib/salaryPayout";

/**
 * Calculate salary payouts for a technician based on their salary type and work history.
 * Returns current period payout, previous month payout, and YTD totals.
 *
 * For HOURLY: Calculates based on clock in/out records and break time
 * For WEEKLY/BI_WEEKLY/MONTHLY: Uses salary-based calculations from salaryPayout.ts
 */
export async function getSalaryPayouts(
  timezone: string,
  currentUserId?: number,
  currentCompanyId?: number,
) {
  try {
    let userId = currentUserId;
    let companyId = currentCompanyId;

    if (!userId || !companyId) {
      const data = await getEssentials();
      if (!userId) userId = data?.userId;
      if (!companyId) companyId = data?.companyId;
    }

    // Get user's salary information from salary history
    const user = await db.user.findUnique({
      where: { id: userId, companyId },
      select: {
        firstName: true,
        lastName: true,
        salaryHistory: {
          where: {
            isActive: true,
          },
          select: {
            salaryType: true,
            salaryAmount: true,
            startDate: true,
          },
          orderBy: {
            startDate: "desc",
          },
          take: 1,
        },
      },
    });
    console.log("user", user);
    if (!user) {
      return {
        currentPeriodPayout: 0,
        pendingPayout: 0,
        payPeriodStart: null,
        payPeriodEnd: null,
        totalHours: 0,
        salaryInfo: {
          salaryType: null,
          salaryAmount: 0,
          previousMonthPayout: 0,
          currentMonthPayout: 0,
          totalPayout: 0,
        },
        error: "User not found",
      };
    }

    // Get the current active salary
    const currentSalary = user.salaryHistory[0];

    if (!currentSalary) {
      return {
        currentPeriodPayout: 0,
        pendingPayout: 0,
        payPeriodStart: null,
        payPeriodEnd: null,
        totalHours: 0,
        salaryInfo: {
          salaryType: null,
          salaryAmount: 0,
          previousMonthPayout: 0,
          currentMonthPayout: 0,
          totalPayout: 0,
        },
        error: "Salary information not configured",
      };
    }

    const currentMonthPayout = await calculateSalaryCurrentMonthEarnings(
      userId,
      companyId,
    );
    const previousMonthPayout = await calculateSalaryPreviousMonthEarnings(
      userId,
      companyId,
    );
    const totalPayout = await calculateSalaryTotalEarnings(userId, companyId);

    const salaryAmount = parseFloat(
      Number(currentSalary.salaryAmount).toFixed(2),
    );

    if (currentSalary.salaryType !== "HOURLY") {
      return {
        currentPeriodPayout: currentMonthPayout,
        pendingPayout: 0,
        payPeriodStart: null,
        payPeriodEnd: null,
        totalHours: 0,
        salaryInfo: {
          salaryType: currentSalary.salaryType,
          salaryAmount,
          previousMonthPayout,
          currentMonthPayout,
          totalPayout,
        },
        error: null,
      };
    }

    const { totalHours, payPeriodStart, payPeriodEnd } =
      await getHourlyPeriodStats(userId, timezone);

    return {
      currentPeriodPayout: currentMonthPayout,
      pendingPayout: 0,
      payPeriodStart,
      payPeriodEnd,
      totalHours,
      salaryInfo: {
        salaryType: "HOURLY",
        salaryAmount,
        hourlyRate: salaryAmount,
        previousMonthPayout,
        currentMonthPayout,
        totalPayout,
      },
      error: null,
    };
  } catch (error) {
    console.error("getSalaryPayouts error:", error);
    return {
      currentPeriodPayout: 0,
      pendingPayout: 0,
      payPeriodStart: null,
      payPeriodEnd: null,
      totalHours: 0,
      salaryInfo: {
        salaryType: null,
        salaryAmount: 0,
        previousMonthPayout: 0,
        currentMonthPayout: 0,
        totalPayout: 0,
      },
      error: "Error calculating salary payouts",
    };
  }
}

/**
 * Hours worked and pay-period boundaries for the current month.
 * The money itself comes from the shared salary calculators so that
 * rate changes recorded in salary history are applied.
 */
async function getHourlyPeriodStats(userId: number, timezone: string) {
  const { currentMonthStart, currentMonthEnd } = getDateRanges(timezone);

  const clockRecords = await db.clockInOut.findMany({
    where: {
      userId,
      clockIn: { gte: currentMonthStart, lte: currentMonthEnd },
      clockOut: { not: null },
    },
    include: { ClockBreak: true },
  });

  let totalHours = 0;

  for (const record of clockRecords) {
    if (!record.clockOut) continue;

    const sessionHours =
      (new Date(record.clockOut).getTime() -
        new Date(record.clockIn).getTime()) /
      (1000 * 60 * 60);

    const breakMinutes = record.ClockBreak.reduce((total, breakRecord) => {
      if (!breakRecord.breakEnd) return total;
      return (
        total +
        (new Date(breakRecord.breakEnd).getTime() -
          new Date(breakRecord.breakStart).getTime()) /
          (1000 * 60)
      );
    }, 0);

    totalHours += sessionHours - breakMinutes / 60;
  }

  return {
    totalHours: Math.max(0, totalHours),
    payPeriodStart: currentMonthStart,
    payPeriodEnd: currentMonthEnd,
  };
}

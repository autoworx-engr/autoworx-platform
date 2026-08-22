"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
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

    // For non-hourly salary types, use the calculation functions from salaryPayout.ts
    if (currentSalary.salaryType !== "HOURLY") {
      const currentMonthPayout = await calculateSalaryCurrentMonthEarnings(
        userId,
        companyId,
      );
      const previousMonthPayout = await calculateSalaryPreviousMonthEarnings(
        userId,
        companyId,
      );
      const totalPayout = await calculateSalaryTotalEarnings(userId, companyId);

      return {
        currentPeriodPayout: currentMonthPayout,
        pendingPayout: 0,
        payPeriodStart: null,
        payPeriodEnd: null,
        totalHours: 0,
        salaryInfo: {
          salaryType: currentSalary.salaryType,
          salaryAmount: parseFloat(
            Number(currentSalary.salaryAmount).toFixed(2),
          ),
          previousMonthPayout,
          currentMonthPayout,
          totalPayout,
        },
        error: null,
      };
    }

    // For hourly, use the existing hourly calculation
    return await calculateHourlyPayout(
      userId,
      currentSalary.salaryAmount,
      timezone,
    );
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
 * Calculate hourly payout based on clock in/out records
 */
async function calculateHourlyPayout(
  userId: number,
  hourlyRate: any,
  timezone: string,
) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  // Get all completed clock in/out records for current month
  const clockRecords = await db.clockInOut.findMany({
    where: {
      userId,
      clockIn: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      clockOut: {
        not: null, // Only count completed sessions
      },
    },
    include: {
      ClockBreak: true,
    },
  });

  let totalHours = 0;
  let totalBreakMinutes = 0;

  for (const record of clockRecords) {
    if (record.clockOut) {
      const clockInTime = new Date(record.clockIn);
      const clockOutTime = new Date(record.clockOut);
      const sessionHours =
        (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      // Calculate break time for this session
      const breakTime = record.ClockBreak.reduce((total, breakRecord) => {
        if (breakRecord.breakEnd) {
          const breakStart = new Date(breakRecord.breakStart);
          const breakEnd = new Date(breakRecord.breakEnd);
          return (
            total + (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
          );
        }
        return total;
      }, 0);

      totalBreakMinutes += breakTime;
      totalHours += sessionHours;
    }
  }

  // Subtract break time from total hours
  totalHours -= totalBreakMinutes / 60;

  const currentPeriodPayout = parseFloat(
    (totalHours * Number(hourlyRate)).toFixed(2),
  );

  return {
    currentPeriodPayout,
    pendingPayout: 0, // For hourly, pending is same as current
    payPeriodStart: startOfMonth,
    payPeriodEnd: endOfMonth,
    totalHours,
    salaryInfo: {
      salaryType: "HOURLY",
      hourlyRate: parseFloat(Number(hourlyRate).toFixed(2)),
      currentMonthPayout: currentPeriodPayout,
      previousMonthPayout: 0, // Would need separate calculation for previous month hourly
      totalPayout: currentPeriodPayout, // For now, same as current
    },
    error: null,
  };
}

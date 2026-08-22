import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { getDateRanges } from "@/actions/dashboard/data/lib";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import {
  getSalaryHistoryForPeriod,
  getActiveSalary,
} from "@/lib/salaryHistoryManager";

/**
 * Calculate salary-based previous month earnings
 */
export async function calculateSalaryPreviousMonthEarnings(
  targetUserId?: number,
  currentCompany?: number,
) {
  const { companyId, userId } = await getEssentials(
    targetUserId,
    currentCompany,
  );
  const { timezone } = await getCompanyTimezone();

  const { previousMonthStart, previousMonthEnd } = getDateRanges(timezone);

  return await calculateSalaryForPeriodWithHistory(
    userId,
    previousMonthStart,
    previousMonthEnd,
    timezone,
  );
}

/**
 * Calculate salary-based current month earnings
 */
export async function calculateSalaryCurrentMonthEarnings(
  targetUserId?: number,
  currentCompany?: number,
) {
  const { companyId, userId } = await getEssentials(
    targetUserId,
    currentCompany,
  );
  const { timezone } = await getCompanyTimezone(currentCompany);

  const { currentMonthStart, currentMonthEnd } = getDateRanges(timezone);

  // Get active salary for special handling of monthly and bi-weekly salaries
  const activeSalary = await getActiveSalary(userId, companyId);
  if (!activeSalary) {
    return 0;
  }

  // For monthly salary, always return the monthly amount for current month regardless of completion
  if (activeSalary.salaryType === "MONTHLY") {
    return parseFloat(Number(activeSalary.salaryAmount).toFixed(2));
  }

  // For bi-weekly salary, show the amount if we're in a current pay period (even if not completed)
  if (activeSalary.salaryType === "BI_WEEKLY") {
    // Check if we're currently in a bi-weekly period that started this month
    const now = new Date();
    const salaryStartDate = new Date(activeSalary.startDate);

    // Find current bi-weekly period
    const daysSinceStart = Math.floor(
      (now.getTime() - salaryStartDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const currentPeriodNumber = Math.floor(daysSinceStart / 14);
    const currentPeriodStart = new Date(
      salaryStartDate.getTime() +
        currentPeriodNumber * 14 * 24 * 60 * 60 * 1000,
    );

    // If current period started in this month, show the amount
    if (currentPeriodStart >= currentMonthStart) {
      return parseFloat(Number(activeSalary.salaryAmount).toFixed(2));
    }
  }

  return await calculateSalaryForPeriodWithHistory(
    userId,
    currentMonthStart,
    currentMonthEnd,
    timezone,
  );
}

/**
 * Calculate salary-based second previous month earnings (for percentage calculation)
 */
export async function calculateSalary2ndPreviousMonthEarnings(
  targetUserId?: number,
  currentCompany?: number,
) {
  const { companyId, userId } = await getEssentials(
    targetUserId,
    currentCompany,
  );
  const { timezone } = await getCompanyTimezone(companyId);

  // Calculate 2nd previous month dates
  const now = new Date();
  const secondPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 2,
    1,
  );
  const secondPreviousMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    0,
  );
  secondPreviousMonthEnd.setHours(23, 59, 59, 999);

  return await calculateSalaryForPeriodWithHistory(
    userId,
    secondPreviousMonth,
    secondPreviousMonthEnd,
    timezone,
  );
}

/**
 * Calculate salary-based YTD earnings
 */
export async function calculateSalaryTotalEarnings(
  targetUserId?: number,
  currentCompanyId?: number,
) {
  const { companyId, userId } = await getEssentials(
    targetUserId,
    currentCompanyId,
  );
  const { timezone } = await getCompanyTimezone();

  // Calculate year-to-date range
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1); // January 1st
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // December 31st

  return await calculateSalaryForPeriodWithHistory(
    userId,
    yearStart,
    yearEnd,
    timezone,
  );
}

/**
 * Calculate salary for a specific period using salary history
 * This handles multiple salary changes within the period
 */
async function calculateSalaryForPeriodWithHistory(
  userId: number,
  periodStart: Date,
  periodEnd: Date,
  timezone: string,
): Promise<number> {
  // Get all salary periods that overlap with the target period
  const salaryPeriods = await getSalaryHistoryForPeriod(
    userId,
    periodStart,
    periodEnd,
  );

  if (salaryPeriods.length === 0) {
    return 0;
  }

  let totalEarnings = 0;

  for (const salaryPeriod of salaryPeriods) {
    // Calculate the effective start and end dates for this salary period within our target period
    const effectiveStart = new Date(
      Math.max(periodStart.getTime(), salaryPeriod.startDate.getTime()),
    );
    const effectiveEnd = new Date(
      Math.min(
        periodEnd.getTime(),
        salaryPeriod.endDate
          ? salaryPeriod.endDate.getTime()
          : new Date().getTime(),
      ),
    );

    // Skip if this period doesn't actually overlap
    if (effectiveStart >= effectiveEnd) {
      continue;
    }

    // Calculate earnings for this specific salary period
    const periodEarnings = await calculateSalaryForPeriod(
      userId,
      salaryPeriod.salaryType,
      salaryPeriod.salaryAmount,
      salaryPeriod.startDate,
      effectiveStart,
      effectiveEnd,
      timezone,
    );

    totalEarnings += periodEarnings;
  }

  return parseFloat(totalEarnings.toFixed(2));
}

/**
 * Calculate salary for a specific period with a single salary configuration
 */
async function calculateSalaryForPeriod(
  userId: number,
  salaryType: string,
  salaryAmount: any,
  salaryStartedAt: Date,
  periodStart: Date,
  periodEnd: Date,
  timezone: string,
): Promise<number> {
  const salaryStartDate = new Date(salaryStartedAt);

  // If the period is before salary started, return 0
  if (periodEnd < salaryStartDate) {
    return 0;
  }

  // Adjust period start if it's before salary started
  const effectiveStart =
    periodStart < salaryStartDate ? salaryStartDate : periodStart;

  switch (salaryType) {
    case "HOURLY":
      return await calculateHourlyForPeriod(
        userId,
        Number(salaryAmount),
        effectiveStart,
        periodEnd,
      );

    case "WEEKLY":
      return calculateWeeklyForPeriod(
        Number(salaryAmount),
        salaryStartDate,
        effectiveStart,
        periodEnd,
      );

    case "BI_WEEKLY":
      return calculateBiWeeklyForPeriod(
        Number(salaryAmount),
        salaryStartDate,
        effectiveStart,
        periodEnd,
      );

    case "MONTHLY":
      return calculateMonthlyForPeriod(
        Number(salaryAmount),
        salaryStartDate,
        effectiveStart,
        periodEnd,
      );

    default:
      return 0;
  }
}

/**
 * Calculate hourly earnings for a period
 */
async function calculateHourlyForPeriod(
  userId: number,
  hourlyRate: number,
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  const clockRecords = await db.clockInOut.findMany({
    where: {
      userId,
      clockIn: {
        gte: periodStart,
        lte: periodEnd,
      },
      clockOut: {
        not: null,
      },
    },
    include: {
      ClockBreak: true,
    },
  });

  let totalHours = 0;

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

      totalHours += sessionHours - breakTime / 60;
    }
  }

  return parseFloat((totalHours * hourlyRate).toFixed(2));
}

/**
 * Calculate weekly earnings for a period
 */
function calculateWeeklyForPeriod(
  weeklyAmount: number,
  salaryStartDate: Date,
  periodStart: Date,
  periodEnd: Date,
): number {
  // Adjust period to not go before salary started
  const effectiveStart =
    periodStart < salaryStartDate ? salaryStartDate : periodStart;

  // If the period is entirely before salary started, return 0
  if (periodEnd < salaryStartDate) {
    return 0;
  }

  const salaryStartTime = salaryStartDate.getTime();
  const effectiveStartTime = effectiveStart.getTime();
  const periodEndTime = periodEnd.getTime();

  let completeWeeks = 0;
  let currentWeekStart = salaryStartTime;

  while (currentWeekStart <= new Date().getTime()) {
    const currentWeekEnd = currentWeekStart + 7 * 24 * 60 * 60 * 1000 - 1;

    const hasCompleted = currentWeekEnd <= new Date().getTime();
    const endsInPeriod =
      hasCompleted &&
      currentWeekEnd >= effectiveStartTime &&
      currentWeekEnd <= periodEndTime;

    if (endsInPeriod) {
      completeWeeks++;
    }

    currentWeekStart += 7 * 24 * 60 * 60 * 1000;
  }

  const totalEarnings = completeWeeks * weeklyAmount;

  return parseFloat(totalEarnings.toFixed(2));
}

/**
 * Calculate bi-weekly earnings for a period
 */
function calculateBiWeeklyForPeriod(
  biWeeklyAmount: number,
  salaryStartDate: Date,
  periodStart: Date,
  periodEnd: Date,
): number {
  // Adjust period to not go before salary started
  const effectiveStart =
    periodStart < salaryStartDate ? salaryStartDate : periodStart;

  // If the period is entirely before salary started, return 0
  if (periodEnd < salaryStartDate) {
    return 0;
  }

  const salaryStartTime = salaryStartDate.getTime();
  const effectiveStartTime = effectiveStart.getTime();
  const periodEndTime = periodEnd.getTime();

  let completeBiWeeks = 0;
  let currentBiWeekStart = salaryStartTime;

  while (currentBiWeekStart <= new Date().getTime()) {
    const currentBiWeekEnd = currentBiWeekStart + 14 * 24 * 60 * 60 * 1000 - 1;

    const hasCompleted = currentBiWeekEnd <= new Date().getTime();
    const endsInPeriod =
      hasCompleted &&
      currentBiWeekEnd >= effectiveStartTime &&
      currentBiWeekEnd <= periodEndTime;

    if (endsInPeriod) {
      completeBiWeeks++;
    }

    currentBiWeekStart += 14 * 24 * 60 * 60 * 1000;
  }

  const totalEarnings = completeBiWeeks * biWeeklyAmount;

  return parseFloat(totalEarnings.toFixed(2));
}

/**
 * Calculate monthly earnings for a period
 */
function calculateMonthlyForPeriod(
  monthlyAmount: number,
  salaryStartDate: Date,
  periodStart: Date,
  periodEnd: Date,
): number {
  // Adjust period to not go before salary started
  const effectiveStart =
    periodStart < salaryStartDate ? salaryStartDate : periodStart;

  // If the period is entirely before salary started, return 0
  if (periodEnd < salaryStartDate) {
    return 0;
  }

  const salaryStartDay = salaryStartDate.getDate();
  const salaryStartMonth = salaryStartDate.getMonth();
  const salaryStartYear = salaryStartDate.getFullYear();

  let completeMonths = 0;

  let currentYear = salaryStartYear;
  let currentMonth = salaryStartMonth;

  while (true) {
    const monthStart = new Date(currentYear, currentMonth, salaryStartDay);
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const monthEnd = new Date(nextYear, nextMonth, salaryStartDay - 1);
    monthEnd.setHours(23, 59, 59, 999);

    if (monthEnd > new Date()) {
      break;
    }

    const overlapsTarget =
      monthEnd >= effectiveStart && monthStart <= periodEnd;

    if (overlapsTarget) {
      completeMonths++;
    }

    currentMonth = nextMonth;
    currentYear = nextYear;

    if (currentYear > new Date().getFullYear() + 1) {
      break;
    }
  }

  const totalEarnings = completeMonths * monthlyAmount;

  return parseFloat(totalEarnings.toFixed(2));
}

/**
 * Get essential information including companyId and userId
 */
async function getEssentials(targetUserId?: number, currentCompany?: number) {
  let companyId = currentCompany;

  if (!companyId) {
    companyId = await getCompanyId();
  }

  let userId: number;
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const session = await getServerSession(authOptions);
    userId = Number(session?.user?.id as string);
  }

  return {
    companyId,
    userId,
  };
}

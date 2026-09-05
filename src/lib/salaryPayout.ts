import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { getDateRanges } from "@/actions/dashboard/data/lib";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { getSalaryHistoryForPeriod } from "@/lib/salaryHistoryManager";

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
 * Total salary earned inside a period.
 *
 * Hourly accrues from real clock records, so each rate span is summed on its own.
 * Fixed salaries pay once per completed cycle. Cycles are anchored to the
 * employee's join date, NOT to each salary record — anchoring per record restarts
 * the cycle on every raise, which pays the overlapping month twice.
 */
async function calculateSalaryForPeriodWithHistory(
  userId: number,
  periodStart: Date,
  periodEnd: Date,
  timezone: string,
): Promise<number> {
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
    if (salaryPeriod.salaryType !== "HOURLY") continue;

    const effectiveStart = new Date(
      Math.max(periodStart.getTime(), salaryPeriod.startDate.getTime()),
    );
    const effectiveEnd = new Date(
      Math.min(
        periodEnd.getTime(),
        salaryPeriod.endDate ? salaryPeriod.endDate.getTime() : Date.now(),
      ),
    );

    if (effectiveStart >= effectiveEnd) continue;

    totalEarnings += await calculateHourlyForPeriod(
      userId,
      Number(salaryPeriod.salaryAmount),
      effectiveStart,
      effectiveEnd,
    );
  }

  const fixedPeriods = salaryPeriods.filter((p) => p.salaryType !== "HOURLY");

  if (fixedPeriods.length > 0) {
    totalEarnings += await calculateFixedSalaryForPeriod(
      userId,
      fixedPeriods,
      periodStart,
      periodEnd,
    );
  }

  return parseFloat(totalEarnings.toFixed(2));
}

type FixedSalaryPeriod = {
  salaryType: string;
  salaryAmount: any;
  startDate: Date;
  endDate: Date | null;
};

function salaryActiveAt(periods: FixedSalaryPeriod[], when: Date) {
  const active = periods.filter(
    (p) => p.startDate <= when && (!p.endDate || p.endDate >= when),
  );
  return active.length > 0 ? active[active.length - 1] : null;
}

function cycleEndFor(cycleStart: Date, salaryType: string, anchorDay: number) {
  if (salaryType === "WEEKLY" || salaryType === "BI_WEEKLY") {
    const days = salaryType === "WEEKLY" ? 7 : 14;
    // Calendar arithmetic, not milliseconds: adding 7*24h lands an hour out
    // across a DST change, which pushes the cycle to 8 days and shifts every
    // later boundary.
    const end = new Date(
      cycleStart.getFullYear(),
      cycleStart.getMonth(),
      cycleStart.getDate() + days - 1,
    );
    end.setHours(23, 59, 59, 999);
    return end;
  }

  const month = cycleStart.getMonth();
  const year = cycleStart.getFullYear();
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const end = new Date(
    nextYear,
    nextMonth,
    clampDayToMonth(nextYear, nextMonth, anchorDay) - 1,
  );
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Walks one cycle timeline from the join date. A cycle pays only once it has
 * completed, at the rate in force when it ended.
 */
async function calculateFixedSalaryForPeriod(
  userId: number,
  fixedPeriods: FixedSalaryPeriod[],
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { joinDate: true },
  });

  const raw = user?.joinDate ?? fixedPeriods[0].startDate;
  const anchor = new Date(
    new Date(raw).getFullYear(),
    new Date(raw).getMonth(),
    new Date(raw).getDate(),
  );

  const anchorDay = anchor.getDate();
  const now = new Date();

  let total = 0;
  let cycleStart = new Date(anchor);

  for (let guard = 0; guard < 5000; guard++) {
    const shaping = salaryActiveAt(fixedPeriods, cycleStart);
    const cycleEnd = cycleEndFor(
      cycleStart,
      shaping?.salaryType ?? fixedPeriods[fixedPeriods.length - 1].salaryType,
      anchorDay,
    );

    if (cycleEnd > now) break;
    if (cycleStart > periodEnd) break;

    if (cycleEnd >= periodStart && cycleEnd <= periodEnd) {
      const paying = salaryActiveAt(fixedPeriods, cycleEnd);
      if (paying) total += Number(paying.salaryAmount);
    }

    cycleStart = new Date(cycleEnd.getTime() + 1);
  }

  return total;
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

// Without clamping, an anchor day of 29-31 rolls `new Date` into the next
// month and the cycle drifts further every iteration.
function clampDayToMonth(year: number, month: number, day: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(day, daysInMonth);
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

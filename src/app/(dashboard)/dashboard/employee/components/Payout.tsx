import { getDateRanges } from "@/actions/dashboard/data/lib";
import { getCommissionBreakdown } from "@/lib/commissionPayout";
import { getCompanyId } from "@/lib/companyId";
import {
  History,
  calculate2ndPreviousMonthEarnings,
  calculateCurrentMonthEarnings,
  calculatePreviousMonthEarnings,
  calculateTotalEarnings,
} from "@/lib/payout";
import {
  calculateSalary2ndPreviousMonthEarnings,
  calculateSalaryCurrentMonthEarnings,
  calculateSalaryPreviousMonthEarnings,
  calculateSalaryTotalEarnings,
} from "@/lib/salaryPayout";
import { EmployeeType } from "@prisma/client";
import moment from "moment-timezone";
import React from "react";
import UnifiedPayoutCard from "./UnifiedPayoutCard";
import { EmployeeWorkInfo } from "./employeeWorkInfoType";

interface PayoutProps {
  info: EmployeeWorkInfo;
  employeeId: number;
  employeeType: EmployeeType | null;
  timezone: string;
}

type Buckets = {
  previous: number;
  current: number;
  secondPrevious: number;
  total: number;
};

const zeroBuckets: Buckets = {
  previous: 0,
  current: 0,
  secondPrevious: 0,
  total: 0,
};

function growth(current: number, previous: number) {
  if (previous === 0) return { percentage: 0, increased: false };
  const difference = current - previous;
  return {
    percentage: +((difference / previous) * 100).toFixed(2),
    increased: difference > 0,
  };
}

/**
 * Payout = salary (every role) + commission (Sales) + job earnings (Technician).
 *
 * employeeId is passed explicitly rather than read off the work-info rows: those
 * are empty for non-technicians, and the fallback resolves to the *viewing*
 * user, which would show an admin their own salary on someone else's page.
 */
export default async function Payout({
  info,
  employeeId,
  employeeType,
  timezone,
}: PayoutProps) {
  const isSales = employeeType === "Sales";
  const isTechnician = employeeType === "Technician";

  const now = moment.tz(timezone);
  const yearStart = now.clone().startOf("year").startOf("day").toDate();
  const yearEnd = now.clone().endOf("year").endOf("day").toDate();

  const [salaryPrevious, salaryCurrent, salarySecond, salaryTotal] =
    await Promise.all([
      calculateSalaryPreviousMonthEarnings(employeeId),
      calculateSalaryCurrentMonthEarnings(employeeId),
      calculateSalary2ndPreviousMonthEarnings(employeeId),
      calculateSalaryTotalEarnings(employeeId),
    ]);

  const salary: Buckets = {
    previous: salaryPrevious,
    current: salaryCurrent,
    secondPrevious: salarySecond,
    total: salaryTotal,
  };

  let jobEarnings: Buckets = zeroBuckets;
  if (isTechnician) {
    const work = info as History[];
    const [previous, current, secondPrevious] = await Promise.all([
      calculatePreviousMonthEarnings(work),
      calculateCurrentMonthEarnings(work),
      calculate2ndPreviousMonthEarnings(work),
    ]);
    // The card is year-to-date, and salary/commission are both year-ranged,
    // so the job total has to be scoped to the year too rather than all-time.
    const thisYear = work.filter((h) => {
      if (!h.dateClosed) return false;
      const closed = new Date(h.dateClosed);
      return closed >= yearStart && closed <= yearEnd;
    });

    jobEarnings = {
      previous,
      current,
      secondPrevious,
      total: calculateTotalEarnings(thisYear),
    };
  }

  let commission: Buckets = zeroBuckets;
  if (isSales) {
    const companyId = await getCompanyId();

    commission = await getCommissionBreakdown(employeeId, companyId, {
      ...getDateRanges(timezone),
      yearStart,
      yearEnd,
    });
  }

  const sum = (k: keyof Buckets) => salary[k] + jobEarnings[k] + commission[k];

  const previousGrowth = growth(sum("previous"), sum("secondPrevious"));
  const currentGrowth = growth(sum("current"), sum("previous"));

  const rows = (k: keyof Buckets) => ({
    workBased: jobEarnings[k],
    salary: salary[k],
    commission: commission[k],
    showWorkBased: isTechnician,
    showCommission: isSales,
    showBreakdown: true,
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <UnifiedPayoutCard
        title="Previous Month"
        amount={sum("previous")}
        percentage={previousGrowth.percentage}
        increased={previousGrowth.increased}
        breakdown={rows("previous")}
      />
      <UnifiedPayoutCard
        title="Current Month"
        amount={sum("current")}
        percentage={currentGrowth.percentage}
        increased={currentGrowth.increased}
        breakdown={rows("current")}
        customStyles="ring-2 ring-primary/20 dark:ring-primary/20 shadow-xl shadow-indigo-100 dark:shadow-none"
      />
      <UnifiedPayoutCard
        title="Year To Date"
        amount={sum("total")}
        breakdown={rows("total")}
        hidePercentage
      />
    </div>
  );
}

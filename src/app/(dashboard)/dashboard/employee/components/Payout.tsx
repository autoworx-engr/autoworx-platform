import {
  calculateUnifiedPreviousMonthEarnings,
  calculateUnifiedCurrentMonthEarnings,
  calculateUnified2ndPreviousMonthEarnings,
  calculateUnifiedTotalEarnings,
  getEarningsBreakdown,
} from "@/lib/unifiedPayout";
import { History } from "@/lib/payout";
import React from "react";
import PayoutCard from "./PayoutCard";
import UnifiedPayoutCard from "./UnifiedPayoutCard";
import { EmployeeWorkInfo } from "./employeeWorkInfoType";

interface PayoutProps {
  info: EmployeeWorkInfo;
  showBreakdown?: boolean;
}

export default async function Payout({
  info,
  showBreakdown = false,
}: PayoutProps) {
  // Calculate unified earnings (work-based + salary if available)
  const previousMonthEarnings = await calculateUnifiedPreviousMonthEarnings(
    info as History[],
  );
  const secondPreviousMonthEarnings =
    await calculateUnified2ndPreviousMonthEarnings(info as History[]);
  const currentMonthEarnings = await calculateUnifiedCurrentMonthEarnings(
    info as History[],
  );
  const totalEarnings = await calculateUnifiedTotalEarnings(info as History[]);

  // Get breakdown for enhanced display
  let earningsBreakdown = null;
  if (showBreakdown) {
    earningsBreakdown = await getEarningsBreakdown(info as History[]);
  }

  // Calculate the percentage change with checks
  let previousMonthPercentageChange = 0;
  let currentMonthPercentageChange = 0;
  let previousMonthIncreased = false;
  let currentMonthIncreased = false;

  if (secondPreviousMonthEarnings !== 0) {
    const earningsDifference =
      previousMonthEarnings - secondPreviousMonthEarnings;
    previousMonthPercentageChange = +(
      (earningsDifference / secondPreviousMonthEarnings) *
      100
    ).toFixed(2);
    previousMonthIncreased = earningsDifference > 0;
  }

  if (previousMonthEarnings !== 0) {
    const earningsDifference = currentMonthEarnings - previousMonthEarnings;
    currentMonthPercentageChange = +(
      (earningsDifference / previousMonthEarnings) *
      100
    ).toFixed(2);
    currentMonthIncreased = earningsDifference > 0;
  }

  // If showing breakdown and user has salary, use UnifiedPayoutCard
  if (showBreakdown && earningsBreakdown?.hasSalary) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <UnifiedPayoutCard
          title="Previous Month"
          amount={previousMonthEarnings}
          percentage={previousMonthPercentageChange}
          increased={previousMonthIncreased}
          breakdown={{
            workBased: earningsBreakdown.workBased.previous,
            salary: earningsBreakdown.salary.previous,
            showBreakdown: true,
          }}
        />
        <UnifiedPayoutCard
          title="Current Month"
          amount={currentMonthEarnings}
          percentage={currentMonthPercentageChange}
          increased={currentMonthIncreased}
          breakdown={{
            workBased: earningsBreakdown.workBased.current,
            salary: earningsBreakdown.salary.current,
            showBreakdown: true,
          }}
          // Highlight current month slightly
          customStyles="ring-2 ring-primary/20 dark:ring-primary/20 shadow-xl shadow-indigo-100 dark:shadow-none"
        />
        <UnifiedPayoutCard
          title="Year To Date"
          amount={totalEarnings}
          breakdown={{
            workBased: earningsBreakdown.workBased.total,
            salary: earningsBreakdown.salary.total,
            showBreakdown: true,
          }}
          hidePercentage
        />
      </div>
    );
  }

  // Default display using regular PayoutCard
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <PayoutCard
        title="Previous Month"
        amount={previousMonthEarnings}
        percentage={previousMonthPercentageChange}
        increased={previousMonthIncreased}
      />
      <PayoutCard
        title="Current Month"
        amount={currentMonthEarnings}
        percentage={currentMonthPercentageChange}
        increased={currentMonthIncreased}
        customStyles="ring-2 ring-primary/20 shadow-lg shadow-indigo-100"
      />
      <PayoutCard title="YTD Payout" amount={totalEarnings} />
    </div>
  );
}

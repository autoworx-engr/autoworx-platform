import { getCompanyId } from "@/lib/companyId";
import {
  calculateCompanyUnifiedCurrentMonthEarnings,
  calculateCompanyUnifiedPreviousMonthEarnings,
  calculateCompanyUnifiedTotalEarnings,
} from "@/lib/unifiedPayout";
import React from "react";
import HorizontalPayoutCard from "./components/HorizontalPayoutCard";
import { formatCurrency } from "@/utils/formatCurrency";

export default async function TotalPayouts() {
  const companyId = await getCompanyId();

  const currentMonthEarnings = await calculateCompanyUnifiedCurrentMonthEarnings(companyId);
  const previousMonthEarnings = await calculateCompanyUnifiedPreviousMonthEarnings(companyId);
  const totalEarnings = await calculateCompanyUnifiedTotalEarnings(companyId);

  // Calculate the percentage change with checks
  let percentageChange = 0;
  let increased = false;
  if (previousMonthEarnings !== 0) {
    const earningsDifference = currentMonthEarnings - previousMonthEarnings;
    percentageChange = +(
      (earningsDifference / previousMonthEarnings) *
      100
    ).toFixed(2);
    increased = earningsDifference > 0;
  }

  return (
    <div className="flex items-center gap-x-8">
      <HorizontalPayoutCard
        title="Monthly Payout"
        amount={formatCurrency(currentMonthEarnings)}
        percentage={percentageChange}
        increased={increased}
      />
      <HorizontalPayoutCard
        title="YTD Payout"
        amount={formatCurrency(totalEarnings)}
      />
    </div>
  );
}

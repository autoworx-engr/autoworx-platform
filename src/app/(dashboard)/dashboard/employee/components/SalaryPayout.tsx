import React from "react";
import PayoutCard from "./PayoutCard";
import {
  calculateSalaryPreviousMonthEarnings,
  calculateSalaryCurrentMonthEarnings,
  calculateSalary2ndPreviousMonthEarnings,
  calculateSalaryTotalEarnings,
} from "@/lib/salaryPayout";
import {
  calculatePreviousMonthEarnings,
  calculateCurrentMonthEarnings,
  calculate2ndPreviousMonthEarnings,
  calculateTotalEarnings,
  History,
} from "@/lib/payout";
import { EmployeeWorkInfo } from "./employeeWorkInfoType";

export default async function SalaryPayout({ 
  info, 
  useSalaryCalculation = false 
}: { 
  info: EmployeeWorkInfo;
  useSalaryCalculation?: boolean;
}) {
  let previousMonthEarnings: number;
  let secondPreviousMonthEarnings: number;
  let currentMonthEarnings: number;
  let totalEarnings: number;

  if (useSalaryCalculation) {
    // Use salary-based calculations
    previousMonthEarnings = await calculateSalaryPreviousMonthEarnings();
    secondPreviousMonthEarnings = await calculateSalary2ndPreviousMonthEarnings();
    currentMonthEarnings = await calculateSalaryCurrentMonthEarnings();
    totalEarnings = await calculateSalaryTotalEarnings();
  } else {
    // Use job-based calculations (original logic)
    previousMonthEarnings = await calculatePreviousMonthEarnings(info as History[]);
    secondPreviousMonthEarnings = await calculate2ndPreviousMonthEarnings(info as History[]);
    currentMonthEarnings = await calculateCurrentMonthEarnings(info as History[]);
    totalEarnings = calculateTotalEarnings(info as History[]);
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

  return (
    <div className="grid grid-cols-1 gap-3 lg:flex lg:grid-cols-3 lg:gap-6">
      <PayoutCard
        title="Previous Month Payout"
        amount={previousMonthEarnings}
        percentage={previousMonthPercentageChange}
        // increased={previousMonthIncreased}
      />
      <PayoutCard
        title="Current Month Payout"
        amount={currentMonthEarnings}
        percentage={currentMonthPercentageChange}
        // increased={currentMonthIncreased}
      />
      <PayoutCard title="YTD Payout" amount={totalEarnings} />
    </div>
  );
}

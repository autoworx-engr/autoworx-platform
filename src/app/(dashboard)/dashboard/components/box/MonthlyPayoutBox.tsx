import React from "react";
import BoxTitle from "./BoxTitle";
import ChartData from "../ChartData";
import { getMonthlyPayout } from "@/actions/dashboard/data/getTechnicianInfo";
import { getSalaryPayouts } from "@/actions/dashboard/data/getSalaryPayouts";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";

export default async function MonthlyPayoutBox() {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const monthlyPayout = await getMonthlyPayout(timezone);
  const salaryPayouts = await getSalaryPayouts(timezone);
  
  // Check if user has valid salary information
  const hasValidSalaryInfo = salaryPayouts && !salaryPayouts.error && salaryPayouts.salaryInfo;
  
  // Calculate totals
  const jobPayout = monthlyPayout?.totalPayout || 0;
  const salaryPayout = hasValidSalaryInfo ? (salaryPayouts.currentPeriodPayout || 0) : 0;
  const totalPayout = jobPayout + salaryPayout;
  
  return (
    <div className="flex-1 rounded-md p-4 shadow-lg xl:p-6">
      <BoxTitle
        title="Monthly Payout"
        redirectLink="/dashboard/reporting/teams"
      />
      <div className="space-y-3">
        {/* Always show job payout */}
        <ChartData
          heading="Job Payout"
          number={jobPayout}
          dollarSign={true}
          isPositive={monthlyPayout?.growth?.isPositive || false}
          rate={monthlyPayout?.growth?.rate || 0}
        />
        
        {/* Show salary payout if available */}
        {hasValidSalaryInfo && (
          <ChartData
            heading="Salary Payout"
            number={salaryPayout}
            dollarSign={true}
            noRate
          />
        )}
        
        {/* Show total payout */}
        <ChartData
          heading="Total Payout"
          number={totalPayout}
          dollarSign={true}
          noRate
        />
        
        {/* Show additional info for salary users */}
        {hasValidSalaryInfo && salaryPayouts.totalHours > 0 && (
          <ChartData
            heading="Hours Worked"
            number={`${Math.round(salaryPayouts.totalHours * 100) / 100} hrs`}
            noRate
          />
        )}
        
        {/* Show pay period for salary users */}
        {hasValidSalaryInfo && salaryPayouts.payPeriodStart && salaryPayouts.payPeriodEnd && (
          <div className="text-xs text-gray-600">
            Pay Period: {new Date(salaryPayouts.payPeriodStart).toLocaleDateString()} - {new Date(salaryPayouts.payPeriodEnd).toLocaleDateString()}
          </div>
        )}
        
        {/* Show expected job payout if available */}
        {!!monthlyPayout?.pendingPayout && monthlyPayout.pendingPayout > 0 && (
          <ChartData
            heading="Expected Job Payout"
            number={monthlyPayout.pendingPayout}
            dollarSign={true}
            noRate
          />
        )}
        
        {/* Show errors */}
        {!salaryPayouts?.error || (
          <div className="text-xs text-orange-600">
            {salaryPayouts.error}
          </div>
        )}
      </div>
    </div>
  );
}

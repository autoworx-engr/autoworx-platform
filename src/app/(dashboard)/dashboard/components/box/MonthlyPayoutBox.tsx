import React from "react";
import BoxTitle from "./BoxTitle";
import ChartData from "../ChartData";
import { getMonthlyPayout } from "@/actions/dashboard/data/getTechnicianInfo";
import { getSalaryPayouts } from "@/actions/dashboard/data/getSalaryPayouts";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import moment from "moment-timezone";
import { cn } from "@/lib/cn"; // Ensure cn is imported
import { Calendar, AlertTriangle } from "lucide-react"; // Import necessary icons
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";

type TMonthlyPayoutBoxProps = {
  className?: string; // Accepts optional classes for layout (e.g., flex-1)
};

export default async function MonthlyPayoutBox({
  className,
}: TMonthlyPayoutBoxProps) {
  // Gated on the route this box links to — Reporting & Analytics, which for the
  // Sales / Technician roles is the view-only column. Checked before fetching so
  // a user without it never runs the payout queries.
  if (!(await hasRouteAccess("/dashboard/reporting/teams"))) {
    return (
      <BoxRestricted
        title="Monthly Payout"
        what="reporting & analytics"
        className={className}
      />
    );
  }

  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const monthlyPayout = await getMonthlyPayout(timezone);
  const salaryPayouts = await getSalaryPayouts(timezone);

  // Check if user has valid salary information
  const hasValidSalaryInfo =
    salaryPayouts && !salaryPayouts.error && salaryPayouts.salaryInfo;

  // Calculate totals
  const jobPayout = monthlyPayout?.totalPayout || 0;
  const salaryPayout = hasValidSalaryInfo
    ? salaryPayouts.currentPeriodPayout || 0
    : 0;
  const totalPayout = jobPayout + salaryPayout;

  // Format hours to two decimal places
  const formattedHours = hasValidSalaryInfo
    ? (Math.round(salaryPayouts.totalHours * 100) / 100).toFixed(2)
    : "0.00";

  // Conditional class for the overall box structure (e.g., if needed for flex-1)
  const isStretched = className && className.includes("flex-1");

  return (
    // Outer Container: Apply Glassmorphism and premium styling
    <div
      className={cn(
        `
          flex flex-col rounded-2xl p-4 transition-all duration-300 md:p-6
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10
          ${isStretched ? "flex-1" : ""}
        `,
        className,
      )}
    >
      <BoxTitle
        title="Monthly Payout"
        redirectLink="/dashboard/reporting/teams"
        className="mb-4 md:mb-6" // Consistent margin below title
      />

      <div className="flex flex-col space-y-4">
        {/* 1. TOTAL PAYOUT (Highest Emphasis) */}
        {/* We use ChartData but override its styles to make the total stand out */}
        <ChartData
          heading="Total Payout"
          number={totalPayout}
          dollarSign={true}
          noRate
          className="p-3 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md"
          numberClassName="!text-3xl font-extrabold text-indigo-600 dark:text-indigo-300"
        />

        {/* 2. JOB PAYOUT */}
        <ChartData
          heading="Job Payout"
          number={jobPayout}
          dollarSign={true}
          isPositive={monthlyPayout?.growth?.isPositive || false}
          rate={monthlyPayout?.growth?.rate || 0}
          className="border-t border-slate-200/50 dark:border-slate-800/50 pt-4"
        />

        {/* 3. SALARY PAYOUT (Conditional) */}
        {hasValidSalaryInfo && (
          <ChartData
            heading="Salary Payout"
            number={salaryPayout}
            dollarSign={true}
            noRate
          />
        )}

        {/* 4. HOURS WORKED & PAY PERIOD (Conditional, Subtler) */}
        {hasValidSalaryInfo && (
          <div className="flex flex-col space-y-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
            {salaryPayouts.totalHours > 0 && (
              <ChartData
                heading="Hours Worked"
                number={`${formattedHours} hrs`}
                noRate
                className="!py-0 !px-0" // Remove padding for compact look
                numberClassName="!text-lg font-bold"
                headingClassName="text-sm text-slate-500 dark:text-slate-400"
              />
            )}

            {salaryPayouts.payPeriodStart && salaryPayouts.payPeriodEnd && (
              <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                <Calendar className="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0" />
                Pay Period:{" "}
                {moment
                  .utc(salaryPayouts.payPeriodStart)
                  .tz(timezone)
                  .format("MM/DD/YYYY")}{" "}
                -{" "}
                {moment
                  .utc(salaryPayouts.payPeriodEnd)
                  .tz(timezone)
                  .format("MM/DD/YYYY")}
              </div>
            )}
          </div>
        )}

        {/* 5. EXPECTED JOB PAYOUT (If pending) */}
        {!!monthlyPayout?.pendingPayout && monthlyPayout.pendingPayout > 0 && (
          <ChartData
            heading="Expected Job Payout"
            number={monthlyPayout.pendingPayout}
            dollarSign={true}
            noRate
            className="text-amber-600 dark:text-amber-400 border-t border-slate-200/50 dark:border-slate-800/50 pt-4"
            headingClassName="font-bold text-base"
          />
        )}

        {/* 6. ERRORS (If present) */}
        {salaryPayouts?.error && (
          <div className="flex items-center text-sm font-semibold text-red-600 dark:text-red-400 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            {salaryPayouts.error}
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";
import BoxTitle from "./BoxTitle";
import ChartData from "../ChartData";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { getPerformance } from "@/actions/dashboard/data/getTechnicianInfo";
import { cn } from "@/lib/cn"; // Assuming cn utility is used for merging classes
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";

type TPerformanceBoxProps = {
  className?: string; // Accepts optional classes for layout (e.g., flex-1)
};

export default async function PerformanceBoxForTechnician({
  className,
}: TPerformanceBoxProps) {
  // Gated on the route this box links to — Reporting & Analytics, which for the
  // Technician role is the view-only column. Checked before fetching so a user
  // without it never runs the performance query.
  if (!(await hasRouteAccess("/dashboard/reporting/technicianreporting"))) {
    return (
      <BoxRestricted
        title="Performance"
        what="reporting & analytics"
        className={className}
      />
    );
  }

  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const performance = await getPerformance(timezone);

  // --- Data Extraction and Formatting ---

  // 1. Total Jobs
  const totalJobsCount = performance?.totalJobs?.count || 0;
  const totalJobsGrowthRate = parseFloat(
    (performance?.totalJobs?.growth?.rate ?? 0).toFixed(2),
  );
  const isTotalJobsPositive =
    performance?.totalJobs?.growth?.isPositive ?? false;

  // 2. On-time Completion Rate
  const onTimeRate =
    parseFloat((performance?.onTimeCompletionRate?.rate ?? 0).toFixed(2)) || 0;
  const onTimeGrowthRate =
    parseFloat(
      (performance?.onTimeCompletionRate?.growth?.rate ?? 0).toFixed(2),
    ) || 0;
  const isOnTimePositive =
    performance?.onTimeCompletionRate?.growth?.isPositive ?? false;

  // console.log({
  //   onTimeRate: performance?.onTimeCompletionRate?.rate,
  //   onTimeGrowthRate: performance?.onTimeCompletionRate?.growth?.rate,
  //   isOnTimePositive,
  // });

  // 3. Rework/Return Rate (Jobs Return Rate)
  // FIX: Accessing 'rate' on 'redoJobs' causes a TypeScript error based on the type definition.
  // We use '.count' as the primary number for the display value, ensuring it's always a number.
  const redoJobsRate = parseFloat(
    (performance?.redoJobs?.count ?? 0).toFixed(2),
  );

  const isRedoGrowthPositive =
    performance?.redoJobs?.growth?.isPositive ?? false;
  const redoGrowthRate = parseFloat(
    (performance?.redoJobs?.growth?.rate ?? 0).toFixed(2),
  );

  // CRITICAL LOGIC FIX: An increase in Redo Rate is NEGATIVE performance.
  // We flip the indicator logic so the component shows red/down arrow when isRedoGrowthPositive is true.
  const isPerformancePositiveForRedo = !isRedoGrowthPositive;
  // --- End Data Formatting ---

  return (
    // Outer Container: Apply Glassmorphism and premium styling
    <div
      className={cn(
        `
          flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl p-4 transition-all duration-300 md:p-6 lg:h-full
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10
          hover:translate-y-[-1px]
        `,
        className, // Apply parent classes (like flex-1)
      )}
    >
      <BoxTitle
        title="Performance"
        redirectLink="/dashboard/reporting/technicianreporting"
        className="mb-4 md:mb-6" // Consistent margin below title
      />

      {/* Metric Content Area - Consistent spacing applied */}
      <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto">
        <ChartData
          heading="Total Jobs Completed"
          number={totalJobsCount}
          // subHeading="/this period"
          isPositive={isTotalJobsPositive}
          rate={totalJobsGrowthRate}
        />
        <ChartData
          heading="On-Time Completion"
          number={onTimeRate}
          // subHeading="Target: >95%"
          isPositive={isOnTimePositive}
          rate={onTimeGrowthRate}
          isNumberPercent
        />
        <ChartData
          heading="Jobs Return Rate"
          number={redoJobsRate}
          // subHeading="Lower is better"
          // Using the corrected, flipped indicator logic
          isPositive={isPerformancePositiveForRedo}
          rate={redoGrowthRate}
          isNumberPercent
        />
      </div>
    </div>
  );
}

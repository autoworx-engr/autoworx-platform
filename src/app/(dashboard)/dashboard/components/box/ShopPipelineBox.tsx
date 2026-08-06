import React from "react";
import ChartData from "../ChartData";
import {
  getCompletedJobs,
  getOngoingJobs,
  getTotalJobs,
} from "@/actions/dashboard/data/getAdminInfo";
import BoxTitle from "./BoxTitle";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { cn } from "@/lib/cn";
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";

type TShopPipelineBoxProps = {
  className?: string;
};

export default async function ShopPipelineBox({
  className,
}: TShopPipelineBoxProps) {
  if (!(await hasRouteAccess("/dashboard/reporting/revenue"))) {
    return (
      <BoxRestricted
        title="Shop Pipeline"
        what="shop pipeline analytics"
        className={className}
      />
    );
  }

  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Await promises concurrently
  const completedJobsPromise = getCompletedJobs(timezone);
  const totalJobsPromise = getTotalJobs();
  const ongoingJobsPromise = getOngoingJobs();

  const [completedJobsData, totalJobsData, ongoingJobsData] = await Promise.all(
    [completedJobsPromise, totalJobsPromise, ongoingJobsPromise],
  );

  // Clean data extraction and formatting
  const totalJobs = totalJobsData?.jobs || 0;
  const ongoingJobs = ongoingJobsData?.ongoingJobs || 0;
  const completedJobs = completedJobsData?.completedJobs || 0;
  const completedJobsGrowthRate = parseFloat(
    (completedJobsData?.growth?.rate ?? 0).toFixed(2),
  );
  const isCompletedJobsPositive =
    completedJobsData?.growth?.isPositive ?? false;

  return (
    <div
      className={cn(
        `
          flex-1 flex flex-col p-4 md:p-6 rounded-2xl transition-all duration-300

          // Glassmorphism aesthetic
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md

          // Subtle border and lift
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20

          // Hover effect for interactivity
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10

        `,
        className,
      )}
    >
      {/* Title and Link */}
      <BoxTitle
        title="Shop Pipeline"
        redirectLink="/dashboard/pipeline/shop/pipeline"
        className="mb-4 md:mb-6" // Consistent spacing
      />

      {/* Metric Content Area - Let ChartData handle vertical separation */}
      <div className="flex flex-col">
        {/* Total Jobs Pending (Potential Workload) */}
        <ChartData
          heading="Total Jobs Pending"
          number={totalJobs}
          subHeading="/monthly workload"
          noRate={true} // No rate needed for current pending count
        />

        {/* Ongoing Jobs (Current Capacity) */}
        <ChartData
          heading="Ongoing Jobs"
          number={ongoingJobs}
          subHeading="/monthly active"
          noRate={true} // No rate needed for current ongoing count
        />

        {/* Completed Jobs (Performance Metric) */}
        <ChartData
          heading="Completed Jobs"
          subHeading="/monthly"
          number={completedJobs}
          // The rate is crucial here to show production health over time
          isPositive={isCompletedJobsPositive}
          rate={completedJobsGrowthRate}
        />
      </div>
    </div>
  );
}

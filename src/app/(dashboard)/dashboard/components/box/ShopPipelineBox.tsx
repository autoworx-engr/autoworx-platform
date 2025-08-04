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

type TShopPipelineBoxProps = {
  className?: string;
};

export default async function ShopPipelineBox({
  className,
}: TShopPipelineBoxProps) {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const completedJobs = await getCompletedJobs(timezone);
  const totalJobsPromise = getTotalJobs();
  const ongoingJobsPromise = getOngoingJobs();

  const [totalJobs, ongoingJobs] = await Promise.all([
    totalJobsPromise,
    ongoingJobsPromise,
  ]);

  return (
    <div className={cn("flex-1 rounded-md p-4 shadow-lg 2xl:px-6", className)}>
      <BoxTitle
        title="Shop Pipeline"
        redirectLink="/dashboard/pipeline/shop/pipeline"
      />
      <div className="space-y-3">
        <ChartData
          heading="Total Jobs Pending"
          number={totalJobs?.jobs || 0}
          noRate={true}
        />
        <ChartData
          heading="Ongoing Jobs"
          number={ongoingJobs?.ongoingJobs || 0}
          noRate
        />
        <ChartData
          heading="Completed Jobs"
          number={completedJobs?.completedJobs || 0}
          isPositive={completedJobs?.growth?.isPositive || false}
          rate={completedJobs?.growth?.rate || 0}
        />
      </div>
    </div>
  );
}

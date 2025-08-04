import React from "react";
import BoxTitle from "./BoxTitle";
import ChartData from "../ChartData";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { getPerformance } from "@/actions/dashboard/data/getTechnicianInfo";

export default async function PerformanceBoxForTechnician() {
  const companyTimezone = await getCompanyTimezone();
  const timezone =
    companyTimezone?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const performance = await getPerformance(timezone);
  return (
    <div className="flex-1 rounded-md p-4 shadow-lg 2xl:px-6">
      <BoxTitle
        title="Performance"
        redirectLink="/dashboard/reporting/technicianreporting"
      />
      <div className="space-y-3">
        <ChartData
          heading="Total Jobs"
          number={performance?.totalJobs?.count || 0}
          isPositive={performance?.totalJobs?.growth?.isPositive || false}
          rate={performance?.totalJobs?.growth?.rate || 0}
        />
        <ChartData
          heading="On-time Completion Rate"
          number={performance?.onTimeCompletionRate?.rate || 0}
          isPositive={
            performance?.onTimeCompletionRate?.growth?.isPositive || false
          }
          rate={performance?.onTimeCompletionRate?.growth?.rate || 0}
          isNumberPercent
        />
        <ChartData
          heading="Jobs Return Rate"
          number={performance?.redoJobs?.count || 0}
          isPositive={performance?.redoJobs?.growth?.isPositive || false}
          rate={performance?.redoJobs?.growth?.rate || 0}
          isNumberPercent
        />
      </div>
    </div>
  );
}

import React from "react";
import ChartData from "../ChartData";
import {
  getConversionRateWithGrowth,
  getConvertedLeadsPerMonth,
  getTotalLeadsPerMonth,
} from "@/actions/dashboard/data/getAdminInfo";
import BoxTitle from "./BoxTitle";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { cn } from "@/lib/cn";
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";

type TSalesPipelineBoxProps = {
  className?: string;
};

export default async function SalesPipelineBox({
  className,
}: TSalesPipelineBoxProps) {
  if (!(await hasRouteAccess("/dashboard/reporting/revenue"))) {
    return (
      <BoxRestricted
        title="Sales Pipeline"
        what="sales pipeline analytics"
        className={className}
      />
    );
  }

  const company = await getCompanyTimezone();
  const timezone =
    company?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const totalLeadsPerMonthPromise = getTotalLeadsPerMonth(timezone);
  const leadsConvertedDataPromise = getConvertedLeadsPerMonth(timezone);
  const conversionRateDataPromise = getConversionRateWithGrowth(timezone);

  const [totalLeadsPerMonth, leadsConvertedData, conversionRateData] =
    await Promise.all([
      totalLeadsPerMonthPromise,
      leadsConvertedDataPromise,
      conversionRateDataPromise,
    ]);

  const currentTotalLeads = totalLeadsPerMonth?.current ?? 0;

  const currentConversionRate = conversionRateData.currentConversionRate;
  const conversionRateGrowth = conversionRateData.conversionRateGrowth;

  return (
    <div
      className={cn(
        `
          flex-1 flex flex-col p-4 md:p-6 rounded-2xl transition-all duration-300

          // Glassmorphism effect applied directly to the box
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
      {/* Title and Link (Always at the top) */}
      <BoxTitle
        title="Sales Pipeline"
        redirectLink="/dashboard/pipeline/sales/pipeline"
        className="mb-4 md:mb-6" // Use margin-bottom to separate title from metrics
      />

      {/* Metric Content Area */}
      {/* Note: The new ChartData component handles internal border separation */}
      <div className="flex flex-col">
        <ChartData
          heading="Leads coming in"
          subHeading="/month"
          number={currentTotalLeads ?? 0}
          noRate={true} // Leads coming in often doesn't need a rate of change
        />

        <ChartData
          heading="Leads Converted"
          subHeading="/month"
          number={leadsConvertedData?.current ?? 0}
          isPositive={leadsConvertedData?.growth?.isPositive ?? false}
          rate={parseFloat(leadsConvertedData?.growth?.rate.toFixed(2) ?? "0")} // Ensure rate is a number
        />
        <ChartData
          heading="Conversion Rate"
          subHeading="Monthly Leads Converted/Total Leads"
          number={parseFloat(currentConversionRate.toFixed(2) ?? "0")} // Ensure number is parsed cleanly
          isPositive={conversionRateGrowth.isPositive ?? false}
          rate={parseFloat(conversionRateGrowth.rate.toFixed(2) ?? "0")} // Ensure rate is a number
          isNumberPercent
        />
      </div>
    </div>
  );
}

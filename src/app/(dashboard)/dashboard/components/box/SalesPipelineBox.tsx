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

type TSalesPipelineBoxProps = {
  className?: string;
};

export default async function SalesPipelineBox({
  className,
}: TSalesPipelineBoxProps) {
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
    <div className={cn("flex-1 rounded-md p-4 shadow-lg 2xl:px-6", className)}>
      {/* Title and Link */}
      <BoxTitle
        title="Sales Pipeline"
        redirectLink="/dashboard/pipeline/sales/pipeline"
      />
      <div className="space-y-3">
        <ChartData
          heading="Leads coming in"
          subHeading="/month"
          number={currentTotalLeads ?? 0}
          noRate={true}
        />
        <ChartData
          heading="Leads Converted"
          number={leadsConvertedData?.current ?? 0}
          isPositive={leadsConvertedData?.growth?.isPositive ?? false}
          rate={leadsConvertedData?.growth?.rate.toFixed(2) ?? 0}
        />
        <ChartData
          heading="Conversion Rate"
          subHeading="Leads Converted/Total Leads"
          number={currentConversionRate.toFixed(2) ?? 0}
          isPositive={conversionRateGrowth.isPositive ?? false}
          rate={conversionRateGrowth.rate.toFixed(2) ?? 0}
          isNumberPercent
        />
      </div>
    </div>
  );
}

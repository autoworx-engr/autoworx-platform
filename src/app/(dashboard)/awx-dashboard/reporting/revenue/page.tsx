"use client";
import React from "react";
import ReportingStatisticsCard from "../../components/ReportingStatisticsCard";

export default function Revenue() {
  return (
    <div className="min-h-screen">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:w-fit">
        <ReportingStatisticsCard title={"New Subscriptions"} statistic={456} />
        <ReportingStatisticsCard title={"Total No. of Shops"} statistic={500} />
        <ReportingStatisticsCard title={"Total Revenue"} statistic={500} />
      </div>
    </div>
  );
}

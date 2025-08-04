"use client";
import React from "react";
import ReportingStatisticsCard from "../../components/ReportingStatisticsCard";

export default function ChurnRate() {
  return (
    <div className="min-h-screen">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:w-fit">
        <ReportingStatisticsCard
          title={"Churn Rate (Number)"}
          statistic={456}
        />
        <ReportingStatisticsCard title={"Churn Rate (%)"} statistic={45} />
      </div>
    </div>
  );
}

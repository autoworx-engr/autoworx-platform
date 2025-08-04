"use client";
import React from "react";
import ReportingStatisticsCard from "../../components/ReportingStatisticsCard";

export default function Bugs() {
  return (
    <div className="min-h-screen">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:w-fit">
        <ReportingStatisticsCard title={"New Bugs"} statistic={546} />
        <ReportingStatisticsCard title={"Total Bugs Solved"} statistic={453} />
        <ReportingStatisticsCard
          title={"Total Bugs Unsolved"}
          statistic={678}
        />
      </div>
    </div>
  );
}

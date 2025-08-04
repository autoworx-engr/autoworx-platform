"use client";
import React from "react";
import ReportLink from "../../dashboard/reporting/components/ReportLink";

type TProps = {
  children: React.ReactNode;
};

export default function AwxReportLayout({ children }: TProps) {
  return (
    <div>
      <div className="flex flex-col gap-10 p-5 lg:flex-row lg:items-center">
        <h1 className="mb-4 text-center text-2xl font-bold lg:mb-0 lg:mr-4 lg:text-left">
          Reporting
        </h1>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-x-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:flex lg:gap-4">
            <ReportLink href="/awx-dashboard/reporting/revenue">
              Revenue
            </ReportLink>
            <ReportLink href="/awx-dashboard/reporting/bugs">Bugs</ReportLink>
            <ReportLink href="/awx-dashboard/reporting/churn-rate">
              Churn Rate
            </ReportLink>
          </div>
        </div>
      </div>
      <div className="bg-background p-5 md:rounded-lg md:shadow-md">
        {children}
      </div>
    </div>
  );
}

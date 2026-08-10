"use client";
import { useGetAllCompanyBugReports } from "@/hooks/bug-reports/useGetAllCompanyBugReports";
import React from "react";
import ReportSkeletonCard from "./ReportSkeletonCard";
import ReportCard, { BugReport } from "./ReportCard";
import ReportNotFoundCard from "./ReportNotFoundCard";

const CompanyReportSection = () => {
  const { data: reports, isFetching, isLoading } = useGetAllCompanyBugReports();

  return (
    <div className="h-screen overflow-hidden rounded-lg bg-background px-5 py-4 text-sm shadow-lg lg:h-[52vh]">
      <h1 className="mb-3 text-xl font-semibold">Reports</h1>
      <div className="pb-10 bg-white h-full">
        <div className="custom-scrollbar h-full space-y-2 overflow-y-auto">
          {isFetching || isLoading ? (
            [1, 2, 3, 4].map((i) => <ReportSkeletonCard key={i} />)
          ) : (reports ?? []).length > 0 ? (
            (reports ?? []).map((report: BugReport) => (
              <ReportCard key={report?.id} report={report} />
            ))
          ) : (
            <ReportNotFoundCard />
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyReportSection;

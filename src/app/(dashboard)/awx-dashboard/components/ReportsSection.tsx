import React from "react";
import ReportSkeletonCard from "./ReportSkeletonCard";
import ReportCard from "./ReportCard";
import ReportNotFoundCard from "./ReportNotFoundCard";

type ReportsSectionProps = {
  reports: any[];
  isLoading: boolean;
  isFetching: boolean;
};

const ReportsSection = ({
  reports,
  isFetching,
  isLoading,
}: ReportsSectionProps) => {
  return (
    <div className="space-y-4 md:w-1/4">
      <h2 className="text-2xl font-bold text-[#66738C]">Reports</h2>
      <div className="pb-4 bg-white">
        <div className="space-y-3 rounded-lg h-[calc(100vh-150px)] overflow-y-auto custom-scrollbar bg-background px-5 py-4">
          {isFetching || isLoading ? (
            [1, 2, 3, 4].map((i) => <ReportSkeletonCard key={i} />)
          ) : reports?.length > 0 ? (
            reports?.map((report: any) => (
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

export default ReportsSection;

import React from "react";
import ReportSkeletonCard from "./ReportSkeletonCard";
import ReportCard, { BugReport } from "./ReportCard";
import ReportNotFoundCard from "./ReportNotFoundCard";

type ReportsSectionProps = {
  reports: BugReport[];
  isLoading: boolean;
  isFetching: boolean;
};

const ReportsSection = ({
  reports,
  isFetching,
  isLoading,
}: ReportsSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-600 dark:text-slate-300">
        Reports
      </h2>
      {/* Container with rounded corners and subtle shadow/ring for a premium look */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 ring-1 ring-slate-200 dark:ring-slate-700 pb-2">
        {/* Scrollable area for reports */}
        <div className="space-y-3 rounded-xl max-h-[80vh] xl:max-h-[calc(100vh-380px)] overflow-y-auto custom-scrollbar bg-transparent px-5 py-4">
          {isFetching || isLoading ? (
            // Use placeholders for loading state
            [1, 2, 3, 4].map((i) => <ReportSkeletonCard key={i} />)
          ) : reports?.length > 0 ? (
            // Render actual report cards
            reports?.map((report) => (
              <ReportCard key={report?.id} report={report} />
            ))
          ) : (
            // Render not found state
            <ReportNotFoundCard />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsSection;

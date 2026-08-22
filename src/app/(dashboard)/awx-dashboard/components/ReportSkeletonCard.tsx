import React from "react";

const ReportSkeletonCard = () => {
  return (
    <div className="relative animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-6">
        <div className="max-w-2/4 flex-1 text-[#66738C]">
          <div className="mb-1 h-4 w-32 rounded bg-gray-200" />
          <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
          <div className="space-y-1">
            <div className="h-5 w-full rounded bg-gray-200" />
            <div className="h-3 w-5/6 rounded bg-gray-200" />
          </div>
        </div>
      </div>
      <div className="absolute right-1 top-1/2 h-[90%] w-1 -translate-y-1/2 rounded-3xl bg-primary/50" />
      <div className="ml-2 mt-4 h-8 w-20 rounded bg-primary/50" />
    </div>
  );
};

export default ReportSkeletonCard;

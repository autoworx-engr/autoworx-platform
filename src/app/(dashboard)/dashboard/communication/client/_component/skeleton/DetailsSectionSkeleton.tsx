import React from "react";

export default function DetailsSectionSkeleton() {
  return (
    <div className="hidden w-full animate-pulse flex-col gap-4 rounded-lg bg-gray-200 p-4 md:h-[90vh] md:w-full lg:flex">
      <div className="h-1/4 w-full rounded bg-gray-300"></div>
      <div className="h-2/4 w-full rounded bg-gray-300"></div>
      <div className="h-1/4 w-full rounded bg-gray-300"></div>
    </div>
  );
}

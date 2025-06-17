import React from "react";

export default function ClientListSkeleton() {
  return (
    <div className="mt-5 h-screen w-full animate-pulse rounded-lg bg-background p-3 md:mt-0 md:h-[83vh] md:w-[23%] md:bg-gray-200 md:p-0">
      <div className="h-2/3 w-full p-4">
        <div className="mb-2 h-4 w-1/2 rounded bg-gray-300"></div>
        <div className="h-4 w-3/4 rounded bg-gray-300"></div>
        <div className="mt-4 h-1/3 w-full rounded-t-lg bg-gray-300"></div>
        <div className="mt-4 h-1/3 w-full rounded-t-lg bg-gray-300"></div>
        <div className="mt-4 h-1/3 w-full rounded-t-lg bg-gray-300"></div>
        <div className="mt-4 hidden h-1/3 w-full rounded-t-lg bg-gray-300 md:block"></div>
      </div>
    </div>
  );
}

import React from "react";

export default function ConversationSkeleton() {
  return (
    <div className="hidden animate-pulse w-full rounded-lg bg-gray-200 md:h-[90vh] md:w-full lg:block">
      <div className="h-2/3 w-full p-4">
        <div className="h-12 w-full rounded bg-gray-300"></div>
        <div className="mt-4 h-1/3 w-full rounded-t-lg bg-gray-300"></div>
        <div className="mt-4 h-1/3 w-full rounded-t-lg bg-gray-300"></div>
        <div className="mt-4 h-1/3 w-full rounded-t-lg bg-gray-300"></div>
        <div className="mt-28 h-12 w-full rounded bg-gray-300"></div>
      </div>
    </div>
  );
}

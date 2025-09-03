import { cn } from "@/lib/utils";
import React from "react";

type ReputationBoxProps = {
  className?: string;
};

export default async function ReputationBox({ className }: ReputationBoxProps) {
  return (
    <div className={cn("h-full flex-1 overflow-y-auto shadow-md", className)}>
      <div className={"flex h-full flex-col rounded-md p-6 shadow-lg"}>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xl font-bold">Reputation Management</span>
        </div>
        <div className="custom-scrollbar flex flex-1 flex-col space-y-4">
          <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
            <div className="relative">
              <span className="animate-gradient-x bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-xl font-semibold text-transparent">
                Something Great is Coming...
              </span>
              <span className="absolute -bottom-1 left-0 h-0.5 w-full animate-pulse bg-gradient-to-r from-blue-600 to-teal-500"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

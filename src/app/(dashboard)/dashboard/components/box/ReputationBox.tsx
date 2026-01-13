import { cn } from "@/lib/utils";
import React from "react";
import BoxTitle from "./BoxTitle";

type ReputationBoxProps = {
  className?: string;
};

export default async function ReputationBox({ className }: ReputationBoxProps) {
  return (
    <div
      className={cn(
        "h-full flex-1 overflow-y-auto shadow-md",

        `
           rounded-2xl shadow-xl transition-all duration-300

          // Glassmorphism effect
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md

          // Subtle border and shadow for lift
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20
        `,
        className
      )}
    >
      <div className={"flex h-full flex-col rounded-md p-6 shadow-lg"}>
        {/* <div className="mb-4 flex items-center justify-between">
          <span className="text-xl font-bold">Reputation Management</span>
        </div> */}

        <BoxTitle
          title="Reputation Management"
          redirectLink="#"
        />
        <div className="custom-scrollbar flex flex-1 flex-col space-y-4">
          <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
            <div className="relative">
              <span className="animate-gradient-x bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-xl font-semibold text-transparent">
                In The Worx
              </span>
              <span className="absolute -bottom-1 left-0 h-0.5 w-full animate-pulse bg-gradient-to-r from-blue-600 to-teal-500"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

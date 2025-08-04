import { cn } from "@/lib/cn";
import React from "react";

interface UnifiedPayoutCardProps {
  title: string;
  amount: number;
  percentage?: number;
  increased?: boolean;
  customStyles?: string;
  hidePercentage?: boolean;
  hideDollar?: boolean;
  breakdown?: {
    workBased: number;
    salary: number;
    showBreakdown?: boolean;
  };
}

const UnifiedPayoutCard = ({
  title,
  amount,
  percentage = 0,
  increased,
  customStyles,
  hidePercentage,
  hideDollar = false,
  breakdown,
}: UnifiedPayoutCardProps) => {
  const showBreakdown = breakdown?.showBreakdown && breakdown.salary > 0;

  return (
    <div
      className={`h-full w-full rounded-lg border border-gray-300 bg-background p-2 text-sm sm:box-border lg:mx-0 lg:w-full lg:p-5 ${customStyles}`}
    >
      <p className="font-inter mb-4 text-xs font-bold text-gray-500 lg:w-[300px] lg:text-xl">
        {title}
      </p>
      <div className="font-inter mb-4 text-[28px] font-semibold text-gray-500 lg:text-6xl">
        {!hideDollar ? "$" : ""}
        {amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>

      {showBreakdown && (
        <div className="mb-3 space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Work-based:</span>
            <span>
              $
              {breakdown.workBased.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Salary:</span>
            <span>
              $
              {breakdown.salary.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="border-t border-gray-300 pt-1"></div>
        </div>
      )}

      {!hidePercentage && (
        <>
          {percentage != 0 && (
            <div
              className={cn(
                "font-inter text-xl font-semibold",
                increased ? "text-green-500" : "text-red-500"
              )}
            >
              {percentage}%
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UnifiedPayoutCard;

import { cn } from "@/lib/cn";
import { TrendingDown, TrendingUp } from "lucide-react";
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
    commission?: number;
    showWorkBased?: boolean;
    showCommission?: boolean;
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
  const showBreakdown = breakdown?.showBreakdown;

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "ring-1 ring-slate-200 dark:ring-slate-800",
        customStyles,
      )}
    >
      <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-gradient-to-br from-purple-50 to-pink-50 opacity-50 blur-2xl dark:from-purple-900/20 dark:to-pink-900/20 transition-opacity group-hover:opacity-100" />

      <div className="relative z-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {title}
        </p>
        <div className="mb-2 text-xl font-bold text-slate-600 dark:text-slate-100 lg:text-3xl tracking-tight">
          {!hideDollar ? "$" : ""}
          {amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>

        {showBreakdown && (
          <div className="mb-1 space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs font-medium text-slate-600 dark:text-slate-400">
            {breakdown.showWorkBased && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Job
                  earnings
                </span>
                <span className="text-slate-600 dark:text-slate-200">
                  $
                  {breakdown.workBased.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {breakdown.showCommission && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{" "}
                  Commission
                </span>
                <span className="text-slate-600 dark:text-slate-200">
                  $
                  {(breakdown.commission ?? 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />{" "}
                Salary
              </span>
              <span className="text-slate-800 dark:text-slate-200">
                $
                {breakdown.salary.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto relative z-10">
        {!hidePercentage && percentage !== 0 && (
          <div
            className={cn(
              "flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
              increased
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
            )}
          >
            {increased ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(percentage)}%
            <span className="ml-1 font-normal text-slate-400 dark:text-slate-500 opacity-80">
              vs last month
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedPayoutCard;

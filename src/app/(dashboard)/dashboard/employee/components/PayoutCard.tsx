import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

interface PayoutCardProps {
  title: string;
  amount: number;
  percentage?: number;
  increased?: boolean;
  customStyles?: string;
  hidePercentage?: boolean;
  hideDollar?: boolean;
}

const PayoutCard = ({
  title,
  amount,
  percentage = 0,
  increased,
  customStyles,
  hidePercentage,
  hideDollar = false,
}: PayoutCardProps) => {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-2 lg:p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-24",
        "ring-1 ring-slate-200 dark:ring-slate-800",
        customStyles
      )}
    >
      {/* Background Glow Effect */}
      <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 opacity-0 blur-2xl dark:from-indigo-900/20 dark:to-blue-900/20 transition-opacity group-hover:opacity-100" />

      <div className="h-full p-2">
        {/* Title */}
        <p className="mb-2 text-base font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 text-left">
          {title}
        </p>
        {/* Amount */}
        <div className="text-2xl font-bold text-slate-600 dark:text-slate-100 lg:text-3xl tracking-tight text-left">
          {!hideDollar ? formatCurrency(amount) : amount}
        </div>
      </div>

      {/* Percentage Change Footer */}
      <div className="mt-6 flex items-center h-6">
        {!hidePercentage && percentage !== 0 ? (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold shadow-md",
              increased
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            )}
          >
            {increased ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(percentage)}%
          </div>
        ) : (
          <div className="h-6" /> // Spacer to maintain layout consistency
        )}
      </div>
    </div>
  );
};

export default PayoutCard;

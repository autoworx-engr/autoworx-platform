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
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "ring-1 ring-slate-200 dark:ring-slate-800",
        customStyles
      )}
    >
      <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 opacity-50 blur-2xl dark:from-indigo-900/20 dark:to-blue-900/20 transition-opacity group-hover:opacity-100" />

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {title}
        </p>
        <div className="text-xl font-bold text-slate-600 dark:text-slate-100 lg:text-3xl tracking-tight">
          {!hideDollar ? formatCurrency(amount) : amount}
        </div>
      </div>

      <div className="mt-6 flex items-center">
        {!hidePercentage && percentage !== 0 ? (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold",
              increased
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            )}
          >
            {increased ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(percentage)}%
          </div>
        ) : (
          <div className="h-6" /> // Spacer
        )}
      </div>
    </div>
  );
};

export default PayoutCard;

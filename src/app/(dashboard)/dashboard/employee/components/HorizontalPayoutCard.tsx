import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

interface PayoutCardProps {
  title: string;
  amount: string;
  percentage?: number;
  increased?: boolean;
  customStyles?: string;
}

const HorizontalPayoutCard = ({
  title,
  amount,
  percentage = 0,
  increased,
  customStyles,
}: PayoutCardProps) => {
  return (
    <div
      className={`
        group relative flex items-center justify-between gap-6
        p-3 rounded-2xl
        bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900
        ring-1 ring-slate-900/5 dark:ring-slate-100/10
        shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)]
        transition-all duration-300 ease-out
        hover:shadow-[0_8px_20px_-6px_rgba(6,81,237,0.15)]
        hover:-translate-y-0.5 hover:scale-[1.005]
        hover:ring-indigo-500/20
        ${customStyles}
      `}
    >
      {/* Left Side: Icon & Title */}
      <div className="flex items-center gap-4">
        {/* Icon Container */}
        <div
          className={`
          flex items-center justify-center w-12 h-12 rounded-xl
          bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800
          ring-1 ring-indigo-100 dark:ring-slate-700
          shadow-sm text-primary
          transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
        `}
        >
          {<DollarSign className="w-6 h-6" />}
        </div>

        {/* Title Text */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
            {title}
          </span>
          {/* Mobile: Amount shows here instead of right side for better stacking if needed, 
              but keeping original layout logic: Title left, Amount right. 
              If you want description here, we can add a description prop. */}
        </div>
      </div>

      {/* Right Side: Amount & Trend */}
      <div className="flex items-center gap-4">
        <div className="font-inter text-2xl font-bold text-slate-600 dark:text-slate-100 tracking-tight">
          {amount}
        </div>

        {/* Trend Badge */}
        {percentage !== 0 && (
          <div
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
              backdrop-blur-sm transition-colors
              ${
                increased
                  ? "bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-rose-100/60 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
              }
            `}
          >
            {increased ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{percentage}%</span>
          </div>
        )}

        {/* Neutral/Zero State */}
        {percentage === 0 && <div className="h-5"></div>}
      </div>

      {/* Decorative Gradient Blur (Only visible on hover) */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-transparent to-indigo-50/30 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
    </div>
  );
};

export default HorizontalPayoutCard;

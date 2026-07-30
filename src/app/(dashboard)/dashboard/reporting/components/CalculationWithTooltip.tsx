"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { formatCurrency } from "@/utils/formatCurrency";
import { Info } from "lucide-react";

type TProps = {
  content: string;
  amount: number;
  hasDateRange: boolean;
  startDate?: string;
  endDate?: string;
  defaultTooltip?: string;
};

export default function CalculationWithTooltip({
  content,
  amount,
  hasDateRange,
  startDate,
  endDate,
  defaultTooltip = "Total revenue from all delivered invoices",
}: TProps) {
  const tooltipContent =
    hasDateRange &&
    startDate &&
    endDate &&
    startDate !== "undefined" &&
    endDate !== "undefined"
      ? `${startDate} to ${endDate}`
      : defaultTooltip;

  const formattedAmount = formatCurrency(Number(amount));
  const shouldShowTooltip = formattedAmount.length > 15;
  const displayAmount = shouldShowTooltip
    ? formattedAmount.slice(0, 15) + "..."
    : formattedAmount;

  return (
    <TooltipProvider>
      <div
        className="relative flex h-36 w-full flex-col items-center justify-center p-4 
        rounded-2xl transition-all duration-300 ease-in-out cursor-default
        sm:h-40 lg:h-48
        bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm
        ring-1 ring-slate-200/70 dark:ring-slate-700/50
        shadow-lg
        hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 dark:hover:shadow-primary/10
        group"
      >
        {/* Info tooltip (top-left) */}
        <div className="absolute left-3 top-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-pointer text-slate-500 dark:text-slate-300">
                <Info className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm font-medium">{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Content Label */}
        <span className="text-center text-base md:text-lg text-slate-600 dark:text-slate-300 font-medium mb-2">
          {content}
        </span>

        {/* Amount with optional tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-center text-3xl font-bold sm:text-4xl text-slate-600 dark:text-white transition-colors duration-300">
              {displayAmount}
            </span>
          </TooltipTrigger>
          {shouldShowTooltip && (
            <TooltipContent>
              <p className="text-sm font-medium">{formattedAmount}</p>
            </TooltipContent>
          )}
        </Tooltip>

        {/* Gradient accent */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-[#8088FF] rounded-b-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300 hover:from-[#505aff] hover:to-primary hover:shadow-xl rounded-2xl" />
      </div>
    </TooltipProvider>
  );
}

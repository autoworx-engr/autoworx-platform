"use client";
import { formatCurrency } from "@/utils/formatCurrency";
import { Info } from "lucide-react";
import { useState } from "react";

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
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipContent =
    hasDateRange &&
    startDate &&
    endDate &&
    startDate !== "undefined" &&
    endDate !== "undefined"
      ? `${startDate} to ${endDate}`
      : defaultTooltip;

  return (
    <div className="relative flex h-32 w-full flex-col items-center justify-center gap-y-3 rounded-lg border p-4 shadow-md sm:gap-y-4 md:h-40 lg:h-48 lg:gap-y-5 lg:p-0">
      <div className="absolute left-2 top-2">
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Info className="h-3 w-3 cursor-pointer" />
        </div>
        {showTooltip && (
          <div
            style={{ backgroundColor: "rgba(102, 115, 140, 0.9)" }}
            className="absolute z-10 flex h-auto w-[135px] items-center justify-center rounded-lg p-2 text-xs text-white md:left-5 md:top-0 md:min-h-[60px] md:text-sm [@media(min-width:425px)]:w-[180px] [@media(min-width:768px)]:w-[200px]"
          >
            {tooltipContent}
          </div>
        )}
      </div>
      <div className="relative flex items-center gap-2">
        <span className="text-center text-base md:text-lg">{content}</span>
      </div>
      <span className="text-center text-base font-bold sm:text-3xl md:text-3xl lg:text-4xl">
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

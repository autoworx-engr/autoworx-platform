import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
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
      className={`h-full w-full rounded-lg border border-gray-300 bg-background p-2 text-sm sm:box-border lg:mx-0 2xl:w-full lg:p-5 ${customStyles}`}
    >
      <p className="font-inter mb-4 text-xs font-bold text-gray-500 lg:w-fit 2xl:w-[300px] lg:text-lg 2xl:text-xl">
        {title}
      </p>
      <div className="font-inter mb-4 text-[28px] font-semibold text-gray-500 lg:text-4xl 2xl:text-6xl">
        {!hideDollar ? formatCurrency(amount) : amount}
      </div>

      <div className="h-6">
        {!hidePercentage && percentage != 0 ? (
          <div
            className={cn(
              "font-inter text-xl font-semibold",
              increased ? "text-green-500" : "text-red-500"
            )}
          >
            {percentage}%
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PayoutCard;

import { cn } from "@/lib/cn";
import React from "react";

interface PayoutCardProps {
  title: string;
  amount: number;
  percentage?: number;
  increased?: boolean;
  customStyles?: string;
  hidePercentage?: boolean;
}

const PayoutCard = ({
  title,
  amount,
  percentage = 0,
  increased,
  customStyles,
  hidePercentage,
}: PayoutCardProps) => {
  return (
    <div
      className={`h-full w-full rounded-lg border border-gray-300 bg-background p-2 text-sm sm:box-border lg:mx-0 lg:w-full lg:p-5 ${customStyles}`}
    >
      <p className="font-inter mb-4 text-xs font-bold text-gray-500 lg:w-[300px] lg:text-xl">
        {title}
      </p>
      <div className="font-inter mb-4 text-[28px] font-semibold text-gray-500 lg:text-6xl">
        ${amount}
      </div>
      {!hidePercentage && (
        <>
          {percentage != 0 && (
            <div
              className={cn(
                "font-inter text-xl font-semibold",
                increased ? "text-green-500" : "text-red-500",
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

export default PayoutCard;

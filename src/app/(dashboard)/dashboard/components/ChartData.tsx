import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { formatCurrency } from "@/utils/formatCurrency";
import { ArrowUp, ArrowDown } from "lucide-react";

const MAX_DISPLAYED_RATE = 999;

const ChartData = ({
  heading,
  subHeading,
  number = 0,
  dollarSign = false,
  columnView = false,
  largeChart = false,
  rate = 0,
  isPositive = true,
  noRate = false,
  isNumberPercent = false,
}: any) => {
  // Define performance colors from the specified palette
  const positiveColor = "text-emerald-500 dark:text-emerald-400";
  const negativeColor = "text-rose-500 dark:text-rose-400";

  const absRate = Math.abs(rate);
  const rateLabel =
    absRate > MAX_DISPLAYED_RATE ? `${MAX_DISPLAYED_RATE}%+` : `${absRate}%`;

  // Container classes for layout
  const containerLayout = columnView
    ? "flex flex-col #mb-4"
    : "flex items-center justify-between gap-x-2 #mb-4";

  return (
    <div className={containerLayout}>
      <div className="min-w-0 flex-1">
        {/* Heading and Subheading - Clean, professional typography */}
        <h3
          title={heading}
          className="truncate text-base font-semibold text-slate-600 dark:text-slate-200"
        >
          {heading}
        </h3>
        {subHeading && (
          <h6
            title={subHeading}
            className="truncate text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            {subHeading}
          </h6>
        )}

        <div className="mt-2 block min-w-0 rounded-xl p-1 transition-all duration-300">
          <span className="block min-w-0">
            {formatCurrency(number).length > 20 ||
            number.toString().length > 20 ? (
              <span className="block truncate text-xl font-bold text-slate-600 dark:text-white xl:text-2xl">
                <Tooltip>
                  <TooltipTrigger>
                    {dollarSign
                      ? formatCurrency(number).slice(0, 20).concat("...")
                      : number.toString().slice(0, 20).concat("...")}
                  </TooltipTrigger>
                  <TooltipContent className="p-2 text-base font-medium">
                    <p>
                      {dollarSign ? formatCurrency(number) : number}
                      {isNumberPercent && "%"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </span>
            ) : (
              // Standard display
              <span className="block truncate text-xl font-bold text-slate-600 dark:text-white xl:text-2xl">
                {dollarSign ? formatCurrency(number) : number}
                {isNumberPercent && "%"}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Rate of Change Indicator (Right side or bottom) */}
      {!noRate && rate !== 0 && (
        <div
          className={`
            mt-1 flex shrink-0 items-center gap-1
            ${columnView ? "mt-3 justify-start" : "justify-center"} // Adjust spacing based on layout
            ${isPositive ? positiveColor : negativeColor}
          `}
        >
          {/* Icon using Lucide (cleaner SVG integration) */}
          <div className="flex items-center justify-center">
            {isPositive ? (
              <ArrowUp className="h-4 w-4" aria-label="Positive change" />
            ) : (
              <ArrowDown className="h-4 w-4" aria-label="Negative change" />
            )}
          </div>

          {/* Rate value */}
          <div className="text-xl font-bold">{rateLabel}</div>
        </div>
      )}
    </div>
  );
};

export default ChartData;

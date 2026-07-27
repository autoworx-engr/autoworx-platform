import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { formatCurrency } from "@/utils/formatCurrency";
import { ArrowUp, ArrowDown } from "lucide-react"; // Using Lucide icons for sleeker SVGs

const MAX_DISPLAYED_RATE = 999;

const ChartData = ({
  heading,
  subHeading,
  number = 0,
  dollarSign = false,
  columnView = false,
  largeChart = false, // Not used in this visual redesign but maintained
  rate = 0,
  isPositive = true,
  noRate = false,
  isNumberPercent = false,
}: any) => {
  // Define performance colors from the specified palette
  const positiveColor = "text-emerald-500 dark:text-emerald-400"; // Emerald/Teal for success
  const negativeColor = "text-rose-500 dark:text-rose-400"; // Red/Rose for destructive/warning

  const absRate = Math.abs(rate);
  const rateLabel =
    absRate > MAX_DISPLAYED_RATE ? `${MAX_DISPLAYED_RATE}%+` : `${absRate}%`;

  // Container classes for layout
  const containerLayout = columnView
    ? "flex flex-col #mb-4"
    : "flex items-center justify-between gap-x-2 #mb-4";

  return (
    <div className={containerLayout}>
      <div className="flex-1">
        {/* Heading and Subheading - Clean, professional typography */}
        <h3 className="text-base font-semibold text-slate-600 dark:text-slate-200">
          {heading}
        </h3>
        {subHeading && (
          <h6 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {subHeading}
          </h6>
        )}

        {/* Primary Metric Number Container */}
        <div
          className={`
            mt-2 inline-block rounded-xl p-1 transition-all duration-300

            
          `}
          // Subtle Gradient and Shadow for Emphasis

          // bg-slate-50/50 dark:bg-slate-800/50
          // ring-1 ring-slate-200/50 dark:ring-slate-700
          // shadow-inner shadow-slate-200/50 dark:shadow-slate-900/50

          // Hover effect: Subtle lift and shadow glow
          // hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10
          // hover:-translate-y-[1px]
        >
          <span>
            {/* Tooltip logic for long numbers */}
            {formatCurrency(number).length > 20 ||
            number.toString().length > 20 ? (
              <span className="text-xl font-bold text-slate-600 dark:text-white xl:text-2xl">
                <Tooltip>
                  <TooltipTrigger>
                    {/* Truncated display */}
                    {dollarSign
                      ? formatCurrency(number).slice(0, 20).concat("...")
                      : number.toString().slice(0, 20).concat("...")}
                  </TooltipTrigger>
                  <TooltipContent className="p-2 text-base font-medium">
                    <p>
                      {/* Full number in tooltip */}
                      {dollarSign ? formatCurrency(number) : number}
                      {isNumberPercent && "%"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </span>
            ) : (
              // Standard display
              <span className="text-xl font-bold text-slate-600 dark:text-white xl:text-2xl">
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
            mt-1 flex items-center gap-1
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

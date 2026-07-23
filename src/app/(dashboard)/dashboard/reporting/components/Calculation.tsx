import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { formatCurrency } from "@/utils/formatCurrency";

type TProps = {
  content: string;
  amount: number;
  isRate?: boolean;
};

export default function Calculation({
  content,
  amount,
  isRate = false,
}: TProps) {
  const formattedAmount = isRate
    ? `${Number(amount).toFixed(2)}%`
    : formatCurrency(Number(amount));

  const shouldShowTooltip = formattedAmount.length > 15;
  const displayAmount = shouldShowTooltip
    ? formattedAmount.slice(0, 15) + "..."
    : formattedAmount;
  console.log("displayAmount", displayAmount);
  return (
    <div
      className="relative flex h-36 w-full flex-col items-center justify-center p-4 
        rounded-2xl transition-all duration-300 ease-in-out cursor-default
        sm:h-40 lg:h-48
        
        // Glassmorphism and base appearance
        bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm
        ring-1 ring-slate-200/70 dark:ring-slate-700/50
        shadow-lg
        
        // Hover effects: subtle lift and shadow glow
        hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 dark:hover:shadow-primary/10
        group"
    >
      {/* Content Label (text-slate-600 for neutral text) */}
      <span className="text-center text-base md:text-lg text-slate-600 dark:text-slate-300 font-medium mb-2">
        {content}
      </span>

      {/* Amount Value (Large, Bold, and Animated) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="
                text-center text-3xl font-bold sm:text-4xl
              text-slate-600 dark:text-white transition-colors duration-300
              "
            >
              {displayAmount}
            </span>
          </TooltipTrigger>
          {shouldShowTooltip && (
            <TooltipContent>
              <p className="text-sm font-medium">{formattedAmount}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Subtle Gradient Accent (for visual interest) */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-[#8088FF] rounded-b-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300 hover:from-[#505aff] hover:to-primary hover:shadow-xl rounded-2xl"></div>
    </div>
  );
}

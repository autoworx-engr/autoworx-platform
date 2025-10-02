import { formatCurrency } from "@/utils/formatCurrency";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";

type TProps = {
  content: string;
  amount: number;
};

export default function Calculation({ content, amount }: TProps) {
  const formattedAmount = formatCurrency(Number(amount));
  const shouldShowTooltip = formattedAmount.length > 15;
  const displayAmount = shouldShowTooltip
    ? formattedAmount.slice(0, 15) + "..."
    : formattedAmount;

  return (
    <div className="flex h-32 w-full flex-col items-center justify-center gap-y-3 rounded-lg border p-4 shadow-md sm:gap-y-4 md:h-40 lg:h-48 lg:gap-y-5 lg:p-0">
      <span className="text-center text-base md:text-lg">{content}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-center text-base font-bold sm:text-3xl md:text-3xl lg:text-4xl cursor-default">
              {displayAmount}
            </span>
          </TooltipTrigger>
          {shouldShowTooltip && (
            <TooltipContent>
              <p>{formattedAmount}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

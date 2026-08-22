import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { BookingStep } from "../../data/types";

const steps: { key: BookingStep; label: string }[] = [
  { key: "services", label: "Services" },
  { key: "datetime", label: "Date & Time" },
  { key: "checkout", label: "Checkout" },
  { key: "confirmation", label: "Confirmed" },
];

const stepOrder: BookingStep[] = [
  "services",
  "datetime",
  "checkout",
  "confirmation",
];

export const ProgressBar = ({ current }: { current: BookingStep }) => {
  const currentIdx = stepOrder.indexOf(current);

  return (
    <div className="flex items-center justify-between w-full max-w-lg mx-auto px-2 py-4">
      {steps.map((s, i) => {
        const isDone =
          i < currentIdx || (current === "confirmation" && i === currentIdx);
        const isActive = i === currentIdx && current !== "confirmation";
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  isDone && "bg-primary text-primary-foreground",
                  isActive &&
                    "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 ring-offset-background",
                  !isDone && !isActive && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                  i < currentIdx ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

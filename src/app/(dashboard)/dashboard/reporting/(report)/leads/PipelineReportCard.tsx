import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

type TProps = {
  title: string;
  averageValue: string;
  rate: number;
  isPositive: boolean;
  noRate?: boolean;
};

export default function PipelineReportCard({
  averageValue,
  title,
  rate = 0,
  isPositive = true,
  noRate = false,
}: TProps) {
  const hasSignature = /[\$\%]/.test(averageValue);
  const [fontSize, setFontSize] = useState("60px");
  const [hoursFontSize, setHoursFontSize] = useState("24px");

  useEffect(() => {
    const handleResize = () => {
      setFontSize(window.innerWidth <= 640 ? "32px" : "60px");
      setHoursFontSize(window.innerWidth <= 640 ? "16px" : "21px");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const rateColor = rate === 0 ? "text-slate-600" : isPositive ? "text-emerald-500" : "text-rose-500";

  return (
    <div
      role="group"
      aria-label={`${title} metric card`}
      className={cn(
        "relative flex w-full items-center justify-between rounded-2xl p-4 sm:p-5 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md ring-1 ring-slate-900/5 dark:ring-white/5 overflow-hidden transition-transform duration-300",
        "hover:-translate-y-0.5 hover:scale-[1.01]"
      )}
    >
      {/* subtle gradient accent (appears on hover) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-8 top-0 bottom-0 w-32 rounded-full bg-gradient-to-br from-[#00b8b0]/30 to-[#0098da]/20 opacity-0 transition-opacity duration-300 group-hover:opacity-80 blur-3xl"
      />

      <div className="z-10 flex-1 min-w-0 space-y-1 sm:space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {title}
        </p>

        <div
          className={cn(
            "flex items-end gap-2 text-2xl font-extrabold text-slate-700 dark:text-white",
            !hasSignature && "items-baseline"
          )}
        >
          {averageValue.split(" ").map((word: string, index: number) => {
            return (
              <span
                key={index}
                style={{
                  fontSize: !hasSignature && index % 2 !== 0 ? hoursFontSize : fontSize,
                  textTransform: "capitalize",
                  lineHeight: 1
                }}
                className="leading-none text-slate-500 dark:text-slate-100"
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {/* rate / change indicator */}
      <div className="z-10 ml-4 flex flex-col items-end">
        {!noRate && (
          <div className="flex items-center gap-3 sm:gap-4">
            {rate !== 0 && (
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-slate-900/5 dark:ring-white/5",
                  isPositive ? "text-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/20" : "text-rose-500 bg-rose-50/60 dark:bg-rose-900/20"
                )}
                aria-hidden
              >
                {isPositive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" role="img" aria-hidden>
                    <path d="M12 8.5l7 7H5l7-7z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" role="img" aria-hidden>
                    <path d="M12 15.5L5 8.5h14l-7 7z" fill="currentColor" />
                  </svg>
                )}
              </div>
            )}

            <div className="flex flex-col items-end">
              <div className={cn("text-lg font-semibold sm:text-xl lg:text-2xl", rateColor)}>
                {rate === 0 ? "0%" : `${Math.abs(rate).toFixed(2)}%`}
              </div>

              <span className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    rate === 0 ? "bg-slate-400/60" : isPositive ? "bg-emerald-400/90" : "bg-rose-400/90"
                  )}
                  aria-hidden
                />
                <span className="sr-only">Change direction</span>
                <span>{rate === 0 ? "No change" : isPositive ? "Up from last" : "Down from last"}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

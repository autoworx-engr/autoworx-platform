import { cn } from "@/lib/cn";
import { FaCaretDown, FaCaretUp } from "react-icons/fa";
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
  const [hoursFontSize, setHoursFontSize] = useState("21px");

  useEffect(() => {
    // Handle window size check on client side only
    const handleResize = () => {
      setFontSize(window.innerWidth <= 640 ? "32px" : "60px");
      setHoursFontSize(window.innerWidth <= 640 ? "16px" : "21px");
    };

    // Set initial sizes
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex w-full items-center justify-between rounded-md border p-3 sm:p-4 lg:p-5">
      <div className="space-y-1 sm:space-y-2">
        <p className="text-lg font-bold capitalize sm:text-xl lg:text-2xl">
          {title}
        </p>
        <div
          className={cn(
            "text-3xl font-bold sm:text-4xl lg:text-6xl",
            !hasSignature && "flex flex-col",
          )}
        >
          {averageValue.split(" ").map((word: string, index: number) => {
            return (
              <span
                key={index}
                style={{
                  fontSize:
                    !hasSignature && index !== 0 ? hoursFontSize : fontSize,
                  textTransform: "capitalize",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex items-center text-[#4DB6AC]">
        {!noRate && (
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            {rate != 0 &&
              (isPositive ? (
                <div className="text-[#4DB6AC]">
                  <FaCaretUp />
                </div>
              ) : (
                <div className="text-red-500">
                  <FaCaretDown />
                </div>
              ))}
            <div
              className={cn(
                "text-lg font-bold sm:text-xl lg:text-2xl",
                rate !== 0 && (isPositive ? "text-[#4DB6AC]" : "text-red-500"),
              )}
            >
              {rate === 0 ? "0%" : `${Math.abs(rate).toFixed(2)}%`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { getPerformanceInfo } from "@/actions/employee/getPerformanceInfo";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn.ts";
import { Info } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import BarChartComponent from "../../employee/components/BarChartComponent";

interface MetricData {
  label: string;
  value: string;
  percentage: number;
  isPositive: boolean;
  isZeroGrowth: boolean;
}

const arrayOfPerformanceWord = ["Average", "Return"];

export default function PerformanceReport() {
  const { data: currentUser } = useSession();

  const { data } = useServerGet(
    getPerformanceInfo,
    Number(currentUser?.user?.id),
  );
  const {
    averageJobTime,
    averageJobTimeGrowthRate,
    returnWorkRate,
    returnWorkRateGrowthRate,
    totalJobsCompletedOnTime,
    totalJobsCompletedLate,
    totalJobs,
  } = data || {};

  const [infoIndex, setInfoIndex] = useState<number | null>(null);

  const getPerformanceContent = (label: string): string | undefined => {
    const labelword = label.split(" ");
    for (const word of labelword) {
      if (arrayOfPerformanceWord.includes(word)) {
        if (word === "Average") {
          return "Average Time to Complete a Job";
        } else if (word === "Return") {
          return "(Return Work/TotalWork)x100%";
        }
      }
      return undefined;
    }
  };
  const metricData: MetricData[] = [
    {
      label: "Average Time to Complete a Job",
      value: Math.floor(averageJobTime || 0) + " hours",
      percentage: averageJobTimeGrowthRate!,
      isPositive: (averageJobTimeGrowthRate || 0) > 0,
      isZeroGrowth: averageJobTimeGrowthRate === 0,
    },
    {
      label: "Return Work Rate by Service Category",
      // value: returnWorkRate + "%",
      value: Math.floor(returnWorkRate || 0) + "%",
      percentage: returnWorkRateGrowthRate!,
      isPositive: (returnWorkRateGrowthRate || 0) > 0,
      isZeroGrowth: returnWorkRateGrowthRate === 0,
    },
  ];
  const combinedData = [
    {
      label: "Assigned",
      value: totalJobs || 0,
    },
    {
      label: "Completed On Time",
      value: totalJobsCompletedOnTime || 0,
    },
    {
      label: "Completed Late",
      value: totalJobsCompletedLate || 0,
    },
  ];
  return (
    <div className="mb-4 mt-5 flex h-full w-full flex-col">
      <h2 className="mb-2 text-xl font-bold">Performance</h2>
      <div className="flex w-full justify-between gap-4">
        <div className="flex w-full flex-col gap-4 md:w-1/2">
          {metricData.map((metric, index) => (
            <div
              key={index}
              className="relative flex flex-col justify-center gap-4 rounded-lg border border-gray-300 bg-background p-4 md:flex-row md:items-center"
            >
              <div className="absolute left-1 top-1">
                <div
                  onMouseEnter={() => setInfoIndex(index)}
                  onMouseLeave={() => setInfoIndex(null)}
                >
                  <Info className="h-3 w-3 cursor-pointer" />
                </div>
                {infoIndex === index && (
                  <div
                    style={{ backgroundColor: "rgba(102, 115, 140, 0.9)" }}
                    className="absolute left-5 top-0 z-10 flex h-auto min-h-[60px] w-[200px] items-center justify-center rounded-lg p-2 text-sm text-white"
                  >
                    {getPerformanceContent(metric.label)}
                  </div>
                )}
              </div>
              <div className="w-[80%] text-lg font-bold text-gray-700">
                {metric.label}
              </div>
              <div className="w-[80%] text-xl font-semibold text-gray-800">
                {metric.value}
              </div>
              {!metric.isZeroGrowth && (
                <div
                  className={cn(
                    "font-inter text-xl font-semibold",
                    metric.isPositive ? "text-green-500" : "text-red-500",
                  )}
                >
                  {(metric.percentage ?? 0).toFixed(2)}%
                </div>
              )}
              {metric.isZeroGrowth && (
                <div className="font-inter text-4xl font-semibold">-</div>
              )}
            </div>
          ))}
        </div>
        <div
          className="hidden flex-shrink rounded-lg border border-gray-300 bg-background md:flex"
          style={{ height: "80%", width: "50%" }}
        >
          {/* //bar chart will be here */}
          <BarChartComponent
            height={300}
            data={combinedData.map((job) => ({
              label: job.label,
              value: job.value,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

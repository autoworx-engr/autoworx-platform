import { useState } from "react";
import BarChartComponent from "./BarChartComponent";
import { useParams } from "next/navigation";
import { useServerGet } from "@/hooks/useServerGet";
import { getPerformanceInfo } from "@/actions/employee/getPerformanceInfo";
import { cn } from "@/lib/cn";
import { Info } from "lucide-react";

interface AttendanceData {
  day: string;
  clockedIn: string;
  clockedOut: string;
  hours: string;
}

interface buttonInfo {
  metricLabel: string;
  content: string;
}

interface MetricData {
  label: string;
  value: string;
  percentage: number;
  isPositive: boolean;
  isZeroGrowth: boolean;
}

const arrayOfPerformanceWord = ["Average", "Return"];

export default function PerformanceTable() {
  const params = useParams();
  const { data } = useServerGet(getPerformanceInfo, Number(params?.id));
  const {
    averageJobTime,
    averageJobTimeGrowthRate,
    returnWorkRate,
    returnWorkRateGrowthRate,
    totalJobs,
    totalJobsCompletedOnTime,
    totalJobsCompletedLate,
  } = data || {};

  const [infoIndex, setInfoIndex] = useState<number | null>(null);

  const metricData: MetricData[] = [
    {
      label: "Average Time to Complete a Job",
      value: Math.floor(averageJobTime || 0) + " hours",
      percentage: Number(
        averageJobTimeGrowthRate ? averageJobTimeGrowthRate?.toFixed(2) : 0
      ),
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
    <div className="my-4 flex h-full flex-col lg:w-1/2">
      <h2 className="mb-2 text-xl font-bold">Performance</h2>
      <div className="flex w-full flex-col gap-4 lg:flex-col">
        {/* First Half */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            {metricData.map((metric, index) => (
              <div
                key={index}
                className="relative flex w-full flex-col gap-x-4 gap-y-2 rounded-xl bg-white p-4 backdrop-blur-md ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md dark:bg-black/30 dark:ring-white/10 dark:hover:shadow-lg"
              >
                <div className="absolute left-2 top-2">
                  <div
                    className="group relative"
                    onMouseEnter={() => setInfoIndex(index)}
                    onMouseLeave={() => setInfoIndex(null)}
                  >
                    <Info className="h-4 w-4 cursor-help text-slate-500 transition duration-300 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200" />
                    {infoIndex === index && (
                      <div className="absolute left-6 top-0 z-10 min-h-[60px] w-[200px] rounded-lg bg-slate-700/90 p-3 text-sm text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 dark:bg-slate-800/90">
                        {getPerformanceContent(metric.label)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-2 text-lg font-bold text-gray-700 lg:w-[80%]">
                  {metric.label}
                </div>
                <div className="ml-2 flex items-center justify-between gap-4">
                  <div className="text-xl font-semibold text-gray-800 lg:w-[80%]">
                    {metric.value}
                  </div>
                  {!metric.isZeroGrowth && (
                    <div
                      className={cn(
                        "font-inter text-xl font-semibold",
                        metric.percentage ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {metric.percentage}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className="m-0 hidden flex-shrink rounded-lg border border-gray-300 bg-background lg:block"
          style={{ height: "60%", width: "100%" }}
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
        {/* Second Half
        <div className="hidden flex-col gap-4 lg:flex lg:w-1/2">
          <div
            className="flex-shrink rounded-lg border border-gray-300 bg-background p-2"
            style={{ height: "50%" }}
          >
            <BarChartComponent
              height={230}
              title="Total Number of Jobs Completed on Time"
              data={totalJobsCompletedOnTime?.map((job) => ({
                category: job.categoryName,
                jobs: job.count,
              }))}
            />
          </div>
          <div
            className="flex-shrink rounded-lg border border-gray-300 bg-background p-2"
            style={{ height: "50%" }}
          >
            <BarChartComponent
              height={230}
              title="Total Number of Jobs Completed Late"
              data={totalJobsCompletedLate?.map((job) => ({
                category: job.categoryName,
                jobs: job.count,
              }))}
            />
          </div>
        </div> */}
      </div>
    </div>
  );
}

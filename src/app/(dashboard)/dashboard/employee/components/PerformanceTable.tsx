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

  const formatJobTime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);

    if (days === 0) {
      return `${remainingHours} hours`;
    } else if (remainingHours === 0) {
      return `${days} ${days === 1 ? "day" : "days"}`;
    } else {
      return `${days} ${days === 1 ? "day" : "days"} ${remainingHours} hours`;
    }
  };

  const metricData: MetricData[] = [
    {
      label: "Average Time to Complete a Job",
      value: formatJobTime(averageJobTime || 0),
      percentage: Number(
        averageJobTimeGrowthRate ? averageJobTimeGrowthRate?.toFixed(2) : 0,
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

  // const getPerformanceContent = (label: string): string | undefined => {
  //   const labelword = label.split(" ");
  //   for (const word of labelword) {
  //     if (arrayOfPerformanceWord.includes(word)) {
  //       if (word === "Average") {
  //         return "Average Time to Complete a Job";
  //       } else if (word === "Return") {
  //         return "(Return Work/TotalWork)x100%";
  //       }
  //     }
  //     return undefined;
  //   }
  // };
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
    <div className="my-4 flex flex-col lg:w-1/2">
      <h2 className="mb-2 text-xl font-bold">Performance</h2>
      <div
        className="relative m-0 flex-1 rounded-lg border border-gray-300 bg-background"
        style={{ minHeight: 300 }}
      >
        <div className="absolute inset-0">
          {/* //bar chart will be here */}
          <BarChartComponent
            height="100%"
            data={combinedData.map((job) => ({
              label: job.label,
              value: job.value,
            }))}
          />
        </div>
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
  );
}

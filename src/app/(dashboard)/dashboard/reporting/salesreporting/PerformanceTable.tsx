"use client";
import { useState } from "react";
import { useServerGet } from "@/hooks/useServerGet";
import { salesUserData } from "@/actions/employee/salesUserData";
import ConvertedDataGraph from "../../employee/components/ConvertedDataGraph";
import SalesAcitivityGraph from "../../employee/components/SalesAcitivityGraph";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { Info } from "lucide-react";

interface MetricData {
  label: string;
  value: string;
  percentage: number;
  isPositive: boolean;
}

const arrayOfPerformanceWord = ["Average", "Return"];

export default function PerformanceTable({
  employeeId,
}: {
  employeeId: number;
}) {
  const [infoIndex, setInfoIndex] = useState<number | null>(null);

  const salesUserId = employeeId;

  const timezone = useCompanyTimezone();
  const { data } = useServerGet(salesUserData, timezone, Number(salesUserId));

  //converting hours into days and hours
  const dayHours = (time: number = 0) => {
    const day = Math.floor(time / 24);
    const hour = Math.floor(time % 24);
    const averageTime = (time < 24 ? time : `${day} Days ${hour}`) ?? 0;

    return averageTime;
  };

  const averageSalesCycleLength = dayHours(
    data?.averageConversionTime as number,
  );

  const metricData: MetricData[] = data
    ? [
        {
          label: "Average Sales Cycle Length",
          value: `${averageSalesCycleLength} Hours`,
          percentage: data.growthRates.averageConversionTimeGR.rate,
          isPositive: data.growthRates.averageConversionTimeGR.isPositive,
        },
        {
          label: "Average Deal Size",
          value: `${(data.averageDealSize ?? 0).toFixed(2)} $`,
          percentage: data.growthRates.averageDealSizeGR.rate,
          isPositive: data.growthRates.averageDealSizeGR.isPositive,
        },
        {
          label: "Lead-to-Opportunity",
          value: `${data.leadToOpportunityRatio}%`,
          percentage: data.growthRates.leadToOpportunityRatioGR.rate,
          isPositive: data.growthRates.leadToOpportunityRatioGR.isPositive,
        },
        // {
        //   label: "Lead Response Time",
        //   value: `${data.avgResponseTime} Hours`,
        //   percentage: data.growthRates.avgResponseTimeGR.rate,
        //   isPositive: data.growthRates.avgResponseTimeGR.isPositive,
        // },
        {
          label: "No of Leads Engaged",
          value: `${data.totalEngaged}`,
          percentage: data.growthRates.totalEngagedGR.rate,
          isPositive: data.growthRates.totalEngagedGR.isPositive,
        },
      ]
    : [];
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

  return (
    <div className="mb-4 flex h-full w-full flex-col">
      <h2 className="mx-2 mb-2 mt-3 text-xl font-bold md:mx-0 md:my-2">
        Performance
      </h2>
      <div className="flex gap-8">
        {/* First Half */}
        <div className="mx-auto flex w-full flex-col px-3 lg:mx-0 lg:w-[30%] lg:gap-6 lg:px-0">
          <div className="flex flex-col gap-4">
            {metricData.map((metric, index) => (
              <div
                key={index}
                className="relative flex items-center justify-center gap-4 rounded-lg border border-gray-300 bg-background p-4"
              >
                {/* <div className="absolute left-1 top-1">
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
                </div> */}

                <div className="w-[80%] text-lg font-bold text-gray-700">
                  {metric.label}
                </div>
                <div className="w-[80%] text-xl font-semibold text-gray-800">
                  {metric.value}
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${metric.isPositive ? "text-green-500" : "text-red-500"}`}
                >
                  <div>
                    {metric.isPositive ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        aria-hidden="true"
                        role="img"
                        fill="#4db6ac"
                      >
                        <path d="M12 8.5l7 7H5l7-7z" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        aria-hidden="true"
                        role="img"
                        fill="#ef4444"
                      >
                        <path d="M12 15.5L5 8.5h14l-7 7z" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                  <div>{Math.abs(metric.percentage)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Second Half */}
        {/* <div className="flex gap-4"> */}
        <div className="hidden gap-6 lg:flex">
          <ConvertedDataGraph data={data?.convertedLeadsPerMonth || []} />
          {/* <SalesAcitivityGraph /> */}
        </div>

        {/* </div> */}
      </div>
    </div>
  );
}

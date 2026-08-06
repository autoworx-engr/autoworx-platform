import { useState } from "react";
import ConvertedDataGraph from "./ConvertedDataGraph";
import { useServerGet } from "@/hooks/useServerGet";
import { salesUserData } from "@/actions/employee/salesUserData";
import { useParams } from "next/navigation";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { Info } from "lucide-react";

interface MetricData {
  label: string;
  value: string;
  percentage: number;
  isPositive: boolean;
}

const arrayOfPerformanceWord = ["Average", "Return"];

export default function SalesPerformanceTable() {
  const [infoIndex, setInfoIndex] = useState<number | null>(null);
  const param = useParams();
  const salesUserId = param?.id as string;
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
          value: `$${data.averageDealSize === 0 ? "0" : data.averageDealSize.toFixed(2)}`,
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
      <h2 className="mb-2 text-xl font-bold">Performance</h2>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
        {/* First Half */}
        <div className="flex w-full flex-col gap-6 lg:w-[30%]">
          <div className="flex h-full flex-col gap-4">
            {metricData.map((metric, index) => (
              <div
                key={index}
                className="relative flex flex-1 items-center justify-center gap-4 rounded-lg border border-gray-300 bg-background p-4"
              >
                <button
                  onClick={() =>
                    setInfoIndex(infoIndex === index ? null : index)
                  }
                >
                  <Info className="absolute left-1 top-0 h-3 w-3" />
                </button>
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
                        width="16"
                        height="16"
                        aria-hidden="true"
                        role="img"
                      >
                        <path d="M12 8.5l7 7H5l7-7z" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        aria-hidden="true"
                        role="img"
                      >
                        <path d="M12 15.5L5 8.5h14l-7 7z" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                  <div>{Math.abs(metric.percentage)}%</div>
                </div>

                {infoIndex === index && (
                  <div
                    style={{ backgroundColor: "rgba(102, 115, 140, 0.9)" }}
                    className="absolute -ml-36 flex h-[80px] w-[250px] items-center justify-center rounded-lg p-2 text-sm text-white"
                  >
                    {getPerformanceContent(metric.label)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Second Half */}

        <div className="relative flex w-full flex-col rounded-lg border border-gray-300 bg-background min-h-[350px] lg:flex-1">
          <div className="absolute inset-0 py-4">
            <ConvertedDataGraph data={data?.convertedLeadsPerMonth || []} />
          </div>
        </div>

        {/* <div className="hidden lg:flex">
          <SalesAcitivityGraph />
        </div> */}

        {/* </div> */}
      </div>
    </div>
  );
}

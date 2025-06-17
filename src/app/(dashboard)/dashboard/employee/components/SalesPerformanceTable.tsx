import { useState } from "react";
import { CiCircleInfo } from "react-icons/ci";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import ConvertedDataGraph from "./ConvertedDataGraph";
import SalesAcitivityGraph from "./SalesAcitivityGraph";
import { useServerGet } from "@/hooks/useServerGet";
import { salesUserData } from "@/actions/employee/salesUserData";
import { useParams } from "next/navigation";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

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

  const metricData: MetricData[] = data
    ? [
        {
          label: "Average Sales Cycle Length",
          value: `${data.averageConversionTime} Hours`,
          percentage: data.growthRates.averageConversionTimeGR.rate,
          isPositive: data.growthRates.averageConversionTimeGR.isPositive,
        },
        {
          label: "Average Deal Size",
          value: `${data.averageDealSize === 0 ? '0' : data.averageDealSize.toFixed(2)} $`,
          percentage: data.growthRates.averageDealSizeGR.rate,
          isPositive: data.growthRates.averageDealSizeGR.isPositive,
        },
        {
          label: "Lead-to-Opportunity",
          value: `${data.leadToOpportunityRatio}%`,
          percentage: data.growthRates.leadToOpportunityRatioGR.rate,
          isPositive: data.growthRates.leadToOpportunityRatioGR.isPositive,
        },
        {
          label: "Lead Response Time",
          value: `${data.avgResponseTime} Hours`,
          percentage: data.growthRates.avgResponseTimeGR.rate,
          isPositive: data.growthRates.avgResponseTimeGR.isPositive,
        },
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
      <div className="flex gap-8">
        {/* First Half */}
        <div className="flex flex-col gap-6 lg:w-[30%]">
          <div className="flex flex-col gap-4">
            {metricData.map((metric, index) => (
              <div
                key={index}
                className="relative flex items-center justify-center gap-4 rounded-lg border border-gray-300 bg-background p-4"
              >
                <button
                  onClick={() =>
                    setInfoIndex(infoIndex === index ? null : index)
                  }
                >
                  <CiCircleInfo className="absolute left-1 top-0 h-3 w-3" />
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
                      <IoMdArrowDropup />
                    ) : (
                      <IoMdArrowDropdown />
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

        <div className="hidden lg:flex">
          <ConvertedDataGraph data={data?.convertedLeadsPerMonth || []} />
        </div>

        <div className="hidden lg:flex">
          <SalesAcitivityGraph />
        </div>

        {/* </div> */}
      </div>
    </div>
  );
}

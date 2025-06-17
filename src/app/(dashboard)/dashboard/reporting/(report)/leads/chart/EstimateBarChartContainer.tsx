"use client";
import { getLeadInfo } from "@/actions/dashboard/data/getLeadInfo";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useServerGet } from "@/hooks/useServerGet";
import { useEffect, useState } from "react";
import { Bar, Label, Tooltip, XAxis, YAxis } from "recharts";

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};
const CustomBar = (props: any) => {
  const { x, y, width, height, fill } = props;
  return (
    <rect
      x={x}
      y={y - 10}
      width={width}
      height={height}
      fill={fill}
      rx="20"
      ry="15"
    />
  );
};

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width / 2}
      y={y - 15}
      fill="#66738C"
      textAnchor="middle"
      dy={-6}
    >
      {value}
    </text>
  );
};
export default function EstimateBarChartContainer({ searchParams }: TProps) {
  // State for startDate and endDate
  const [startDate, setStartDate] = useState<string | undefined>(
    searchParams?.startDate,
  );
  const [endDate, setEndDate] = useState<string | undefined>(
    searchParams?.endDate,
  );
  const [isFiltered, setIsFiltered] = useState<boolean>(false);

  // Update local state when searchParams change
  useEffect(() => {
    setStartDate(searchParams?.startDate);
    setEndDate(searchParams?.endDate);
    setIsFiltered(!!searchParams?.startDate || !!searchParams?.endDate);
  }, [searchParams?.startDate, searchParams?.endDate]);
  const timezone = useCompanyTimezone();

  // Fetch data with date filters
  const { data, setData } = useServerGet(() =>
    getLeadInfo(
      timezone,
      startDate ? decodeURIComponent(startDate) : undefined,
      endDate ? decodeURIComponent(endDate) : undefined,
    ),
  );

  // Re-fetch data when date parameters change
  useEffect(() => {
    getLeadInfo(
      timezone,
      startDate ? decodeURIComponent(startDate) : undefined,
      endDate ? decodeURIComponent(endDate) : undefined,
    ).then(setData);
  }, [startDate, endDate]);
  return (
    <div className="chart-container">
      <BarChartComponent
        height={350}
        title="Leads Converted per Month"
        data={data?.convertedLeadsPerMonth || []}
      >
        <XAxis tickLine={false} dataKey={"month"} />
        <YAxis tick={false}>
          <Label
            angle={-90}
            value="Number of Jobs"
            position="top"
            offset={30}
            style={{
              textAnchor: "middle",
              transform: "translateX(3px)",
              fontWeight: "bold",
              fontSize: ".9rem",
            }}
          >
            Leads
          </Label>
        </YAxis>
        <Tooltip />
        <Bar
          dataKey={"converted"}
          name="Converted"
          fill="#03A7A2"
          shape={<CustomBar />}
          label={<CustomLabel />}
          barSize={isFiltered ? 30 : 28}
          height={200}
        />
      </BarChartComponent>
    </div>
  );
}

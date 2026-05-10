"use client";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { Bar, Label, Tooltip, XAxis, YAxis } from "recharts";

import LeadsChartSkeleton from "@/components/ui/LeadsChartSkeleton";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { useEffect, useState } from "react";
import useGetLeadInfoQuery from "../_hook/useGetLeadInfoQuery";

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};

const CustomBar = (props: any) => {
  const { x, y, width, height, fill } = props;
  return <rect x={x} y={y - 10} width={width} height={height} fill={fill} />;
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
export default function InvoicesBarChartContainer({ searchParams }: TProps) {
  const [startDate, setStartDate] = useState<string | undefined>(
    searchParams?.startDate,
  );
  const [endDate, setEndDate] = useState<string | undefined>(
    searchParams?.endDate,
  );
  // const [isFiltered, setIsFiltered] = useState<boolean>(false);

  const { data } = useGetLeadInfoQuery({
    startDate: startDate ? decodeURIComponent(startDate) : undefined,
    endDate: endDate ? decodeURIComponent(endDate) : undefined,
  });

  // Update local state when searchParams change
  useEffect(() => {
    if (searchParams?.startDate && searchParams?.endDate) {
      setStartDate(searchParams.startDate);
      setEndDate(searchParams.endDate);
      // setIsFiltered(true);
    } else {
      const now = new Date();
      const firstDay = startOfMonth(now);
      const lastDay = endOfMonth(now);

      setStartDate(format(firstDay, "yyyy-MM-dd"));
      setEndDate(format(lastDay, "yyyy-MM-dd"));
      // setIsFiltered(false);
    }
  }, [searchParams?.startDate, searchParams?.endDate]);

  // Fetch data with date filters
  if (!data)
    return <LeadsChartSkeleton variant="single" bars={12} height={400} />;

  return (
    <div
      className="chart-container"
      style={{ display: "flex", justifyContent: "flex-start" }}
    >
      <BarChartComponent
        height={350}
        title="Lead Source Performance"
        data={data?.leadsBySource || []}
      >
        <XAxis tickLine={false} dataKey={"source"} interval={0} />
        <YAxis tick={false}>
          <Label
            angle={-360}
            value="Leads"
            position="top"
            offset={20}
            style={{
              textAnchor: "middle",
              transform: "translateX(20px)",
              fontWeight: "bold",
            }}
          >
            Leads
          </Label>
        </YAxis>
        <Tooltip />

        <Bar
          dataKey="leads"
          name="Leads"
          fill="#03A7A2"
          shape={<CustomBar />}
          label={<CustomLabel />}
          barSize={58}
        />
      </BarChartComponent>
    </div>
  );
}

"use client";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { Bar, Label, LabelList, Legend, Tooltip, XAxis, YAxis } from "recharts";
import useGetLeadInfoQuery from "../_hook/useGetLeadInfoQuery";

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};
const CustomBar = ({ isFiltered, isExtraLargeScreen, ...props }: any) => {
  const { x, y, width, height, fill } = props;
  const barWidth = Math.min(width * 1.5, 30);

  let multiplier;
  if (isFiltered) {
    if (isExtraLargeScreen) {
      multiplier = 0.7; // Adjusted value for extra large screens when filtered
    } else {
      multiplier = 0.6;
    }
  } else if (isExtraLargeScreen) {
    multiplier = 0.7; // Different value for extra large screens
  } else {
    multiplier = 0.5;
  }

  const xPosition = x + width * multiplier;
  // const xPosition = isFiltered ? x + width * 0.5 : x + width * 0.5;

  return (
    <rect
      x={xPosition}
      y={y - 10}
      width={barWidth}
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
    <text x={x + width} y={y - 15} fill="#66738C" textAnchor="middle" dy={-6}>
      {value}
    </text>
  );
};
export default function LeadsBarChartContainer({ searchParams }: TProps) {
  // const [data, setData] = useState<any>();
  const isExtraLargeScreen = useMediaQuery({ minWidth: 2001 });

  // State for startDate and endDate
  const [startDate, setStartDate] = useState<string | undefined>(
    searchParams?.startDate
  );
  const [endDate, setEndDate] = useState<string | undefined>(
    searchParams?.endDate
  );
  const [isFiltered, setIsFiltered] = useState<boolean>(false);

  const { data } = useGetLeadInfoQuery({ startDate, endDate });

  // Update local state when searchParams change
  useEffect(() => {
    setStartDate(searchParams?.startDate);
    setEndDate(searchParams?.endDate);
    setIsFiltered(!!searchParams?.startDate || !!searchParams?.endDate);
  }, [searchParams?.startDate, searchParams?.endDate]);

  return (
    <div className="chart-container">
      <BarChartComponent
        height={350}
        title="Lead Volume"
        data={data?.monthlyQualifiedAndUnqualifiedLeads || []}
      >
        <XAxis dataKey="month" />
        <YAxis tick={false}>
          <Label
            angle={-360}
            value="Leads"
            position="top"
            offset={20}
            style={{
              textAnchor: "middle",
              transform: "translateX(10px)",
              fontWeight: "bold",
            }}
          >
            Leads
          </Label>
        </YAxis>
        <Tooltip />
        <Legend verticalAlign="top" align="right" layout="horizontal" />

        <Bar
          dataKey="qualified"
          fill="#03A7A2"
          shape={
            <CustomBar
              isFiltered={isFiltered}
              isExtraLargeScreen={isExtraLargeScreen}
            />
          }
          barSize={40}
          name="Qualified"
        >
          <LabelList
            dataKey={(entry: any) =>
              (entry.qualified ?? 0) + (entry.unqualified ?? 0)
            }
            position="top"
            fill="#66738C"
            content={<CustomLabel />}
          />
        </Bar>
        <Bar
          dataKey="unqualified"
          fill="#006D77"
          name="Unqualified"
          shape={(props: any) => {
            const { x, y, width, height, ...rest } = props;
            const barWidth = Math.min(width * 1.5, 30);

            // const xPosition = isFiltered
            //   ? x - width * 1
            //   : x - width * (dummyData.length <= 10 ? 0.4 : 0.3);

            let multiplier;
            if (isFiltered) {
              multiplier = 1;
            } else if (isExtraLargeScreen) {
              multiplier = 0.4; // Extra value for screens wider than 2000px
            } else {
              multiplier =
                (data?.monthlyQualifiedAndUnqualifiedLeads?.length ?? 0) <= 10
                  ? 0.4
                  : 0.5;
            }

            const xPosition = isFiltered
              ? x - width * 0.4
              : x - width * multiplier;
            return (
              <rect
                x={xPosition}
                y={y - 10}
                rx="20"
                ry="15"
                width={barWidth}
                height={height}
                {...rest}
              />
            );
          }}
          barSize={40}
        />
      </BarChartComponent>
    </div>
  );
}

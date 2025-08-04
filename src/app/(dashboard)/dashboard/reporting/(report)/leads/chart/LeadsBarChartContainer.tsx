"use client";
import { getLeadInfo } from "@/actions/dashboard/data/getLeadInfo";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { Bar, Label, LabelList, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { useMediaQuery } from "react-responsive";
import { useEffect, useState } from "react";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};
const CustomBar = ({ isFiltered, ...props }: any) => {
  const { x, y, width, height, fill } = props;
  const barWidth = Math.min(width * 1.5, 30);
  const xPosition = isFiltered ? x + 24 : x + 8;
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
  const [data, setData] = useState<any>();
  const isMax2540 = useMediaQuery({ query: "(max-width: 2540px)" });
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
  // const { data, setData } = useServerGet(() =>
  //   getLeadInfo(
  //     timezone,
  //     startDate ? decodeURIComponent(startDate) : undefined,
  //     endDate ? decodeURIComponent(endDate) : undefined,
  //   ),
  // );

  // Re-fetch data when date parameters change
  useEffect(() => {
    let isMounted = true;
    // setLoading(true);

    const fetchData = async () => {
      try {
        const result = await getLeadInfo(
          timezone,
          startDate ? decodeURIComponent(startDate) : undefined,
          endDate ? decodeURIComponent(endDate) : undefined,
        );
        if (isMounted) {
          setData(result);
        }
      } catch (error) {
        if (isMounted) {
          // setError(error as Error);
          setData(null); // Reset the data if there's an error
        }
      } finally {
        if (isMounted) {
          // setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, timezone]);

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
          shape={<CustomBar isFiltered={isFiltered} />}
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
            return (
              <rect
                // x={x - 9}
                x={!isFiltered ? (isMax2540 ? x - 9 : x - 16) : x - 20}
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

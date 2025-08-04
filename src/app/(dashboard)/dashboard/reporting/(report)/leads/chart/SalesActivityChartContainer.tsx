"use client";
import { Bar, Legend, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { useMediaQuery } from "react-responsive";

const data = [
  {
    category: "Messages",
    Inbound: 1000,
    Outbound: 200,
  },
  {
    category: "Email",
    Inbound: 180,
    Outbound: 100,
  },
  {
    category: "Calls",
    Inbound: 60,
    Outbound: 150,
  },
];

const CustomBar = (props: any) => {
  const { x, y, width, height, fill } = props;
  return <rect x={x} y={y} width={width} height={height} fill={fill} />;
};

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width / 2}
      y={y - 15}
      fill="#66738C"
      textAnchor="middle"
      dy={-8}
    >
      {value}
    </text>
  );
};

export default function SalesActivityChartContainer() {
  const isMax2540 = useMediaQuery({ query: "(max-width: 2540px)" });
  return (
    <div className="chart-container">
      <BarChartComponent height={350} title="Sales Activity" data={data}>
        <XAxis tickLine={false} dataKey={"category"} />
        <YAxis tick={false} />
        <Tooltip />
        <Legend verticalAlign="top" align="right" layout="horizontal" />
        <Bar
          dataKey="Outbound"
          fill="#006D77"
          stackId="stack"
          shape={<CustomBar />}
          barSize={60}
        />
        <Bar
          dataKey="Inbound"
          fill="#03A7A2"
          stackId="stack"
          shape={<CustomBar />}
          barSize={60}
        >
          <LabelList
            dataKey={(entry) => entry.Inbound + entry.Outbound}
            position="top"
            content={<CustomLabel />}
          />
        </Bar>
      </BarChartComponent>
    </div>
  );
}

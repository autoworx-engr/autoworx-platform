"use client";
import { Bar, Legend, Tooltip, XAxis, YAxis } from "recharts";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";

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
  return (
    <rect
      x={x + 20}
      y={y - 10}
      width={width}
      height={height}
      fill={fill}
      // rx={5}
      // ry={5}
    />
  );
};

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width - 10}
      y={y - 25}
      fill="#66738C"
      textAnchor="middle"
      dy={-8}
    >
      {value}
    </text>
  );
};
export default function SalesAcitivityGraph() {
  return (
    <div className="chart-container">
      <BarChartComponent height={350} title="Sales Activity" data={data}>
        <XAxis tickLine={false} dataKey={"category"} />
        <YAxis tick={false} />
        <Tooltip />
        <Legend verticalAlign="top" align="right" layout="horizontal" />
        <Bar
          dataKey="Inbound"
          fill="#03A7A2"
          shape={<CustomBar />}
          label={<CustomLabel />}
        />
        <Bar
          dataKey="Outbound"
          fill="#006D77"
          shape={(props: any) => {
            const { x, y, width, height, ...rest } = props;
            return (
              <rect
                x={x - 41}
                y={y - 10}
                width={width}
                height={height}
                {...rest}
              />
            );
          }}
          label={<CustomLabel />}
        />
      </BarChartComponent>
    </div>
  );
}

"use client";
import { Bar, Label, Tooltip, XAxis, YAxis } from "recharts";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";

interface ConvertedDataGraphProps {
  data: { month: string; converted: number }[];
}
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
export default function ConvertedDataGraph({ data }: ConvertedDataGraphProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center px-2">
      <BarChartComponent
        height="100%"
        title="Leads Converted Per Month"
        data={data}
      >
        <XAxis tickLine={false} dataKey={"month"} />
        <YAxis tick={false}>
          <Label
            angle={-360}
            value="Leads"
            position="top"
            offset={20}
            style={{
              textAnchor: "middle",
              transform: "translateX(-5px)",
              fontWeight: "bold",
            }}
          >
            Leads
          </Label>
        </YAxis>
        <Tooltip />

        <Bar
          dataKey="converted"
          name="Converted"
          fill="#03A7A2"
          shape={<CustomBar />}
          label={<CustomLabel />}
        />
      </BarChartComponent>
    </div>
  );
}

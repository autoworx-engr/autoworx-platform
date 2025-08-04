"use client";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { formatCurrency } from "@/utils/formatCurrency";
import { Bar, Label, Tooltip, XAxis, YAxis } from "recharts";

const CustomBar = (props: any) => {
  const { x, y, width, height, fill, style } = props;
  return (
    <rect
      x={x}
      y={y - 30}
      width={width}
      height={Math.abs(height)}
      fill={fill}
      style={style}
    />
  );
};

const CustomLabel = ({ x, y, width, value, data }: any) => {
  // Find the original salePrice by matching the absolute values
  const originalValue =
    data.find(
      (item: { salePrice: number; absoluteSalePrice: number }) =>
        Math.abs(item.absoluteSalePrice) === Math.abs(value)
    )?.salePrice ?? value;

  return (
    <text
      x={x + width / 2}
      y={y - 35}
      fill="#66738C"
      textAnchor="middle"
      dy={-6}
    >
      {formatCurrency(originalValue)}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { payload: data } = payload[0];
    return (
      <div className="w-fit rounded-lg border border-black bg-background p-4 text-[#03A7A2]">
        <p className="text-xl">{data?.categoryName}</p>
        <p className="text-2xl">{formatCurrency(data?.salePrice)}</p>
      </div>
    );
  }

  return null;
};

type TProps = {
  data: {
    categoryName: string | undefined;
    salePrice: number;
  }[];
};

export default function RevenueBarChartContainer({ data }: TProps) {
  const transformedData = data.map((item) => ({
    ...item,
    absoluteSalePrice: Math.abs(item.salePrice),
  }));

  return (
    <div className="chart-container border-none">
      <BarChartComponent height={500} title="" data={transformedData}>
        <XAxis tick={false} dataKey={"categoryName"}>
          <Label
            angle={-360}
            value="Number of Jobs"
            position="insideBottomRight"
            style={{
              textAnchor: "end",
              fontWeight: "bold",
            }}
          >
            Category
          </Label>
        </XAxis>
        <Tooltip cursor={{ fill: "transparent" }} content={<CustomTooltip />} />
        <YAxis tick={false} dataKey={"absoluteSalePrice"}>
          <Label
            angle={270}
            value="Number of Jobs"
            position="insideTopRight"
            y="70"
            style={{
              textAnchor: "end",
              transform: "rotate(270deg) translate(-110px, -25px)",
              fontWeight: "bold",
            }}
          >
            Revenue
          </Label>
        </YAxis>
        <Bar
          dataKey={"absoluteSalePrice"}
          fill="#ffffff"
          style={{ stroke: "#03A7A2", strokeWidth: 2 }}
          shape={<CustomBar />}
          label={(props) => <CustomLabel {...props} data={transformedData} />}
        />
      </BarChartComponent>
    </div>
  );
}

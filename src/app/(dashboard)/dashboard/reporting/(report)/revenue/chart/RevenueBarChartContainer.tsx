"use client";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatLargeNumber } from "@/utils/formatLargeNumber";
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
      rx={6}
      ry={6}
      style={style}
    />
  );
};

const CustomLabel = ({ x, y, width, value, data }: any) => {
  // Find the original salePrice by matching the absolute values
  const originalValue =
    data.find(
      (item: { salePrice: number; absoluteSalePrice: number }) =>
        Math.abs(item.absoluteSalePrice) === Math.abs(value),
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

// const CustomTooltip = ({ active, payload }: any) => {
//   if (active && payload && payload.length) {
//     const { payload: data } = payload[0];
//     return (
//       <div className="w-fit rounded-lg border border-black bg-background p-4 text-[#03A7A2]">
//         <p className="text-xl">{data?.categoryName}</p>
//         <p className="text-2xl">{formatCurrency(data?.salePrice)}</p>
//       </div>
//     );
//   }

//   return null;
// };

const CustomTooltip = ({ active, payload, isMobile, labe }: any) => {
  if (active && payload && payload.length) {
    const { payload: data } = payload[0];
    const salePrice = data?.salePrice ? Number(data.salePrice.toFixed(2)) : 0;

    // Use abbreviated format for very large numbers
    const displayValue =
      salePrice >= 1000
        ? `$${formatLargeNumber(salePrice)}`
        : formatCurrency(salePrice);

    return (
      <div
        className={`${isMobile ? "min-w-fit" : "min-w-36"} max-w-xs rounded-lg border border-gray-300 bg-white p-3 shadow-lg`}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800 truncate">
            {data?.categoryName || "Unknown Category"}
          </p>
          <div className="border-t border-gray-200 pt-2">
            <p className="text-lg font-bold text-[#03A7A2]">{displayValue}</p>
            {salePrice >= 1000 && (
              <p className="text-xs text-gray-500 mt-1">
                Exact: {formatCurrency(salePrice)}
              </p>
            )}
          </div>
        </div>
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
  const isMobile = useMediaQuery("(max-width: 640px)");
  const transformedData = data.map((item) => ({
    ...item,
    absoluteSalePrice: Math.abs(item.salePrice),
  }));

  const chartData =
    transformedData.length > 0
      ? transformedData
      : [{ categoryName: "No Data", salePrice: 0, absoluteSalePrice: 0 }];

  return (
    <div className="relative w-full overflow-hidden">
      <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent w-full overflow-x-auto pb-4">
        <div
          className={`chart-container border-none ${isMobile ? "min-w-0" : "w-full"}`}
        >
          <BarChartComponent height={500} title="" data={chartData}>
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
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={<CustomTooltip isMobile={isMobile} />}
            />
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
              fill="#03A7A2"
              style={{ stroke: "#03A7A2", strokeWidth: 2 }}
              shape={<CustomBar />}
              label={(props) => (
                <CustomLabel {...props} data={transformedData} />
              )}
            />
          </BarChartComponent>
        </div>
      </div>
    </div>
  );
}

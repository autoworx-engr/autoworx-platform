"use client";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatLargeNumber } from "@/utils/formatLargeNumber";
import { Bar, Label, Tooltip, XAxis, YAxis } from "recharts";

const CustomBar = (props: any) => {
  const { x, y, width, height, fill } = props;
  return (
    <rect
      x={x}
      y={y - 25}
      width={width}
      height={height}
      fill={fill}
      rx={5}
      ry={5}
    />
  );
};

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width / 2}
      y={y - 25}
      fill="#66738C"
      textAnchor="middle"
      dy={-6}
    >
      {formatCurrency(value)}
    </text>
  );
};
// const CustomTooltip = ({ active, payload }: any) => {
//   if (active && payload && payload.length) {
//     const { payload: data } = payload[0];
//     return (
//       <div className="w-56 rounded-lg border border-black bg-background p-4 text-[#03A7A2]">
//         <p className="text-xl">{data?.method}</p>
//         <p className="text-2xl">{formatCurrency(data?.payment)}</p>
//       </div>
//     );
//   }

//   return null;
// };

const CustomTooltip = ({ active, payload, isMobile, labe }: any) => {
  if (active && payload && payload.length) {
    const { payload: data } = payload[0];
    const payment = data?.payment ? Number(data.payment.toFixed(2)) : 0;

    // Use abbreviated format for very large numbers
    const displayValue =
      payment >= 1000
        ? `$${formatLargeNumber(payment)}`
        : formatCurrency(payment);

    return (
      <div
        className={`${isMobile ? "min-w-fit" : "min-w-36"} max-w-xs rounded-lg border border-gray-300 bg-white p-3 shadow-lg`}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800 truncate">
            {data?.method || "Unknown Method"}
          </p>
          <div className="border-t border-gray-200 pt-2">
            <p className="text-lg font-bold text-[#03A7A2]">{displayValue}</p>
            {payment >= 1000 && (
              <p className="text-xs text-gray-500 mt-1">
                Exact: {formatCurrency(payment)}
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
  paymentData: Array<{ method: string; payment: number }>;
};

export default function PaymentBarChartContainer({ paymentData }: TProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  return (
    <div className="relative w-full overflow-hidden">
      <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent w-full overflow-x-auto pb-4">
        <div
          className={`chart-container border-none ${isMobile ? "min-w-0" : "w-full"}`}
        >
          <BarChartComponent height={500} title="" data={paymentData}>
            <XAxis
              dataKey={"method"}
              height={80}
              style={{ fontSize: "18px", fontWeight: "600" }}
            >
              <Label
                angle={-360}
                value="method"
                position={"centerBottom"}
                offset={0}
                style={{
                  textAnchor: "middle",
                  fontWeight: "bold",
                  fontSize: 14,
                }}
              >
                Type
              </Label>
            </XAxis>
            <YAxis tick={false} dataKey={"payment"}>
              <Label
                angle={-90}
                value="Amount"
                position="insideLeft"
                offset={10}
                y={70}
                style={{
                  textAnchor: "middle",

                  fontWeight: "bold",
                  fontSize: 14,
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  padding: "2px 4px",
                  borderRadius: "2px",
                }}
              >
                Amount
              </Label>
            </YAxis>
            <Bar
              dataKey={"payment"}
              fill="#03A7A2"
              shape={<CustomBar />}
              label={<CustomLabel />}
              name={"Type"}
            />
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={<CustomTooltip isMobile={isMobile} />}
            />
          </BarChartComponent>
        </div>
      </div>
    </div>
  );
}

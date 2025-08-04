"use client";
import BarChartComponent from "@/app/(dashboard)/dashboard/reporting/components/BarChartComponent";
import { formatCurrency } from "@/utils/formatCurrency";
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
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { payload: data } = payload[0];
    return (
      <div className="w-56 rounded-lg border border-black bg-background p-4 text-[#03A7A2]">
        <p className="text-xl">{data?.method}</p>
        <p className="text-2xl">{formatCurrency(data?.payment)}</p>
      </div>
    );
  }

  return null;
};

type TProps = {
  paymentData: Array<{ method: string; payment: number }>;
};

export default function PaymentBarChartContainer({ paymentData }: TProps) {
  return (
    <div className="chart-container">
      <BarChartComponent height={500} title="" data={paymentData}>
        <XAxis
          
          dataKey={"method"}
          height={ 80}
             style={{ fontSize: "18px", fontWeight: "600" }}
        >
          <Label
                                    angle={-360}
                                    value="method"
                                    position={"centerBottom"}
                                    offset={ 0}
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
                                    offset={ 10}
                                    y={ 70}
                                    style={{
                                      textAnchor: "middle",
                                     
                                      fontWeight: "bold",
                                      fontSize:  14,
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
          content={<CustomTooltip />}
          label={"Type"}
        />
      </BarChartComponent>
    </div>
  );
}

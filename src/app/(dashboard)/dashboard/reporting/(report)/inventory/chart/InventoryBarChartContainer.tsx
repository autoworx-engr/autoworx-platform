"use client";
import React from "react";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatCurrency } from "@/utils/formatCurrency";
import { useEffect, useState } from "react";
import {
  Bar,
  Label,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BarChartComponent from "../../../components/BarChartComponent";
import { formatLargeNumber } from "@/utils/formatLargeNumber";

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

const CustomLabel = (props: any) => {
  const { x, y, width, value, isMobile } = props;
  // Format the value with toFixed(2) for display in the label
  const formattedValue =
    typeof value === "number"
      ? formatCurrency(Number(value.toFixed(2)))
      : value;

  const fontSize = isMobile ? 10 : 12;
  return (
    <text
      x={x + width / 2}
      y={y - 35}
      fill="#66738C"
      textAnchor="middle"
      dy={-6}
      fontSize={fontSize}
    >
      {formattedValue}
    </text>
  );
};

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
  chartData: {
    categoryName: string | undefined;
    salePrice: number;
  }[];
  yAxisLabel: string;
};
const InventoryBarChartContainer = ({ chartData, yAxisLabel }: TProps) => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  //determine the chart height based on the screen size
  const getChartHeight = () => {
    const baseHeight = isMobile ? 300 : isTablet ? 400 : 500;
    // Adjust height based on number of data points for better spacing
    const dataLength = chartData.length;
    if (dataLength > 8) {
      return isMobile ? 400 : isTablet ? 500 : 600;
    }
    return baseHeight;
  };

  // Format the purchasesData to ensure salePrice values have toFixed(2) applied
  const formattedChartData =
    chartData && chartData.length > 0
      ? chartData.map((item) => ({
          categoryName: item?.categoryName || "Uncategorized",
          salePrice: Number(Number(item?.salePrice || 0).toFixed(2)),
        }))
      : [{ categoryName: "No Data", salePrice: 0 }];

  // State to track window resize for ResponsiveContainer
  const [key, setKey] = useState(0);

  // Force ResponsiveContainer to re-render on window resize
  useEffect(() => {
    const handleResize = () => setKey((prev) => prev + 1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <div className="relative w-full overflow-hidden">
      <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent w-full overflow-x-auto pb-4">
        <div
          className={`chart-container border-none ${isMobile ? "min-w-0" : ""}`}
        >
          <ResponsiveContainer width="100%" height={getChartHeight()} key={key}>
            <BarChartComponent height="" title="" data={formattedChartData}>
              <XAxis
                tick={false}
                dataKey={"categoryName"}
                height={isMobile ? 40 : 60}
              >
                <Label
                  angle={-360}
                  value="Number of Jobs"
                  position={isMobile ? "insideBottom" : "insideBottomRight"}
                  offset={isMobile ? -3 : 0}
                  style={{
                    textAnchor: "end",
                    fontWeight: "bold",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  Category
                </Label>
              </XAxis>
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={<CustomTooltip isMobile={isMobile} />}
              />
              <YAxis
                tick={false}
                dataKey={"salePrice"}
                width={isMobile ? 40 : 60}
              >
                <Label
                  angle={270}
                  value="Number of Jobs"
                  position={"insideTopRight"}
                  offset={isMobile ? -6 : 10}
                  y={isMobile ? 140 : 70}
                  style={{
                    textAnchor: "middle",
                    transform: isMobile
                      ? "rotate(270deg) translate(-100px, -30px)"
                      : "rotate(270deg) translate(-110px, -25px)",
                    fontWeight: "bold",
                    fontSize: isMobile ? 12 : 14,
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    padding: "2px 4px",
                    borderRadius: "2px",
                  }}
                >
                  {yAxisLabel}
                </Label>
              </YAxis>
              <Bar
                dataKey={"salePrice"}
                fill="#03A7A2"
                style={{ stroke: "#03A7A2", strokeWidth: isMobile ? 1.5 : 2 }}
                shape={<CustomBar />}
                label={<CustomLabel isMobile={isMobile} />}
              />
            </BarChartComponent>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InventoryBarChartContainer;

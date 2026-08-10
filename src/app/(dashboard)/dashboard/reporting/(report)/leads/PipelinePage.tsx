"use client";
import { use } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import dynamic from "next/dynamic";
import PipelineCardContainer from "./PipelineCardContainer";

// Dynamically import components that should only load on desktop
const DesktopCharts = dynamic(() => import("./DesktopCharts"), { ssr: false });

type TProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
};

type TSliderData = {
  id: number;
  min: number;
  max: number;
  defaultValue?: [number, number];
  type: "price" | "cost" | "profit";
};
// const filterMultipleSliders: TSliderData[] = [
//   {
//     id: 1,
//     type: "price",
//     min: 0,
//     max: 300,
//     // defaultValue: [50, 250],
//   },
//   {
//     id: 2,
//     type: "cost",
//     min: 0,
//     max: 400,
//     // defaultValue: [100, 300],
//   },
//   {
//     id: 3,
//     type: "profit",
//     min: 0,
//     max: 500,
//   },
// ];

export default function PipelinePage(props: TProps) {
  const searchParams = use(props.searchParams);
  const isDesktop = useIsDesktop();

  return (
    <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-5">
      <div className="space-y-5 col-span-1 lg:col-span-2">
        <PipelineCardContainer searchParams={searchParams} />
      </div>

      {isDesktop && <DesktopCharts searchParams={searchParams} />}
    </div>
  );
}

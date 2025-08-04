"use client";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import dynamic from "next/dynamic";
import PipelineCardContainer from "./PipelineCardContainer";

// Dynamically import components that should only load on desktop
const DesktopCharts = dynamic(() => import("./DesktopCharts"), { ssr: false });

type TProps = {
  searchParams: {
    startDate?: string;
    endDate?: string;
  };
};

type TSliderData = {
  id: number;
  min: number;
  max: number;
  defaultValue?: [number, number];
  type: "price" | "cost" | "profit";
};
const filterMultipleSliders: TSliderData[] = [
  {
    id: 1,
    type: "price",
    min: 0,
    max: 300,
    // defaultValue: [50, 250],
  },
  {
    id: 2,
    type: "cost",
    min: 0,
    max: 400,
    // defaultValue: [100, 300],
  },
  {
    id: 3,
    type: "profit",
    min: 0,
    max: 500,
  },
];

export default function PipelinePage({ searchParams }: TProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-3">
      <div className="space-y-5">
        <PipelineCardContainer searchParams={searchParams}/>
      </div>

      {isDesktop && <DesktopCharts searchParams={searchParams}/>}
    </div>
  );
}

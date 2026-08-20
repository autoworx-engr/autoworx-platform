"use client";

import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import { useEstimateFilterStore } from "@/stores/estimate-filter";
import DateRange from "../../../../../components/DateRange";
import Dropdown from "./Dropdown";
import SearchTerms from "./SearchTerms";
import { cn } from "@/lib/cn";

interface Props {
  pipelineType: string;
}

export default function FilterComp({ pipelineType }: Props) {
  const { setFilter, resetStatus, searchTerm, dateRange, status, service } =
    usePipelineFilterStore();

  return (
    <div className="mt-5 flex w-full items-center justify-between">
      <div className="flex w-full max-w-4xl flex-col gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm md:flex-row md:flex-wrap md:items-center">
        <SearchTerms />
        <div className="flex flex-row items-center gap-3 md:flex-1 md:flex-wrap md:min-w-fit">
          <div className="flex-1 min-w-0 md:min-w-[200px]">
            <DateRange
              onOk={(start, end) => setFilter({ dateRange: [start, end] })}
              onCancel={() => setFilter({ dateRange: [null, null] })}
            />
          </div>
          <div className="relative flex-shrink-0">
            <Dropdown pipelineType={pipelineType} />
          </div>
        </div>
      </div>
    </div>
  );
}

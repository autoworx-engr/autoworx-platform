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
  const { search, setFilter: setEstimateFilter } = useEstimateFilterStore();

  const hasActiveFilters = !!(
    search ||
    searchTerm ||
    (dateRange[0] && dateRange[1]) ||
    status ||
    service
  );

  const handleClearFilters = () => {
    resetStatus();
    setEstimateFilter({ search: "" });
  };

  return (
    <div className="mt-5 flex w-full items-center justify-between">
      <div className="flex w-full max-w-4xl flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <SearchTerms />
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-fit">
          <div className="flex-1 min-w-[200px]">
            <DateRange
              onOk={(start, end) => setFilter({ dateRange: [start, end] })}
              onCancel={() => setFilter({ dateRange: [null, null] })}
            />
          </div>
          <div className="relative">
            <Dropdown pipelineType={pipelineType} />
          </div>
          <button
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            className={cn(
              "group flex items-center justify-center gap-2 rounded-lg px-4 py-2 transition-all duration-200 whitespace-nowrap",
              hasActiveFilters
                ? "hover:bg-red-50 text-slate-500 hover:text-red-500 active:scale-95 border border-slate-200 hover:border-red-100"
                : "opacity-50 cursor-not-allowed text-slate-400 border border-slate-200",
            )}
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import SearchTerms from "../pipeline/components/SearchTerms";

interface Props {
  pipelineType: string;
}


export default function FilterForDatabase({ pipelineType }: Props) {
  const { setFilter } = usePipelineFilterStore();

  return (
    <div className="mt-5 flex w-full items-center justify-between">
      <div className="flex w-full max-w-4xl rounded-lg border border-gray-300 bg-background p-2">
        <div className="flex w-full items-center gap-4">
          <SearchTerms />
          <div className="hidden items-center gap-4 lg:flex">
            {/* <div className="relative">
              <Dropdown pipelineType={pipelineType} />
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}

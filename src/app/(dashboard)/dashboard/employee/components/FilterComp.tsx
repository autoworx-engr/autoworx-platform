"use client";

import { DropdownSelection } from "@/components/DropDownSelection";
import DateRange from "@/components/DateRange";
import Filter from "./Filter";
import Search from "./Search";
import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";

type TProps = {
  service: string[];
  category: string[];
};

export default function FilterComp({ service, category }: TProps) {
  const {
    setFilter,
    category: selectedCategory,
    service: selectedService,
    dateRange,
  } = useEmployeeWorkFilterStore();

  return (
    <div className="mt-5 flex w-full flex-col gap-4 md:flex-row md:items-center">
      <div className="relative z-20 w-full md:max-w-4xl">
        <div className="relative group flex w-full items-center gap-3 rounded-2xl bg-white/60 dark:bg-slate-900/50 ring-1 ring-slate-900/5 dark:ring-slate-700/30 p-3 pl-4 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-lg">
          {/* subtle shimmer on hover (light/dark aware) */}
          <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-30 bg-gradient-to-r from-white/0 via-white/40 to-white/0 dark:from-transparent dark:via-black/20 dark:to-transparent mix-blend-screen" />

          <div className="flex-1">
            <div className="flex w-full items-center gap-3 sm:gap-4">
              <div className="flex-1">
                <Search />
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-transparent p-0 transition-transform duration-300 hover:-translate-y-0.5">
                  <DateRange
                    dateRange={dateRange}
                    onOk={(start, end) =>
                      setFilter({ dateRange: [start, end] })
                    }
                    onCancel={() => setFilter({ dateRange: [null, null] })}
                  />
                </div>
              </div>
              <div>
                <Filter />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 self-start md:self-auto">
        <div className="relative flex items-center">
          <div className="rounded-lg bg-transparent p-1 transition-transform duration-300 hover:-translate-y-0.5"></div>
          {/* The dropdowns are intentionally left commented to preserve existing behavior; re-enable when needed. */}
          {/* Category based filter */}
          {/* <div className="ml-3 hidden sm:block">
            <DropdownSelection
              dropDownValues={category}
              onValueChange={(value) => setFilter({ category: value })}
              changesValue={selectedCategory}
              defaultValue="Category"
            />
          </div> */}
        </div>

        {/* Service based filter (kept commented) */}
        {/* <div className="hidden sm:block">
          <DropdownSelection
            dropDownValues={service}
            onValueChange={(value) => setFilter({ service: value })}
            changesValue={selectedService}
            defaultValue="Service"
          />
        </div> */}
      </div>
    </div>
  );
}

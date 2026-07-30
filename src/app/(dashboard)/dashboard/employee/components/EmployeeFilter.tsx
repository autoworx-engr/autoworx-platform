"use client";

import DateRange from "@/components/DateRange";
import { DropdownSelection } from "@/components/DropDownSelection";
import AddNewEmployee from "@/components/Lists/NewEmployee";
import { useDebounce } from "@/hooks/useDebounce";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { EMPLOYEE_LIST_KEY } from "../_hook/useEmployeeQuery";

// filter component for /employee page
export default function EmployeeFilter() {
  const { dateRange, search, type, currentPage, pageSize, setFilter } =
    useEmployeeFilterStore();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    setFilter({ search: "", dateRange: [null, null], type: "All" });
  }, []);
  const handleSearchChange = useDebounce((value: string) => {
    setFilter({ search: value });
  }, 500);
  const handleAddEmployeeSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: [
        EMPLOYEE_LIST_KEY,
        currentPage,
        pageSize,
        type,
        search,
        dateRange[0],
        dateRange[1],
      ],
    });
  };
  return (
    <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl relative z-10">
      {/* Added container padding for demo purposes */}

      <div className="flex flex-col items-end gap-4 lg:flex-row lg:items-center lg:justify-between pt-2">
        <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-4 lg:w-fit">
          {/* Refined Search Container */}
          <div
            className="
            group relative flex w-full items-center gap-x-3 rounded-xl
            bg-white dark:bg-slate-900 
            px-4 py-2.5 lg:w-[400px] xl:w-[500px]
            ring-1 ring-slate-200 dark:ring-slate-700
            shadow-sm transition-all duration-300 ease-out
            focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50
            focus-within:shadow-md focus-within:shadow-indigo-500/5
            hover:ring-slate-300 dark:hover:ring-slate-600
          "
          >
            <span className="text-slate-400 group-focus-within:text-primary transition-colors duration-300">
              <Search className="w-5 h-5" />
            </span>
            <input
              name="search"
              type="text"
              className="
                w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 
                placeholder:text-slate-400 focus:outline-none
              "
              placeholder="Search by Employee ID, Name, Email..."
              onChange={(e) => {
                setSearchInput(e.target.value);
                handleSearchChange(e.target.value.trim());
              }}
            />
          </div>

          {/* Filter Group */}
          <div className="hidden items-center gap-x-4 lg:flex">
            <div className="transition-transform hover:scale-[1.01]">
              <DateRange
                dateRange={dateRange}
                onOk={(start: any, end: any) =>
                  setFilter({ dateRange: [start, end] })
                }
                onCancel={() => setFilter({ dateRange: [null, null] })}
              />
            </div>

            <DropdownSelection
              dropDownValues={[
                "All",
                "Sales",
                "Technician",
                "Manager",
                "Other",
              ]}
              onValueChange={(value: any) => setFilter({ type: value })}
              changesValue={type}
              buttonClassName="
                min-w-[140px] rounded-xl border-none 
                bg-white dark:bg-slate-900 
                ring-1 ring-slate-200 dark:ring-slate-700 
                shadow-sm text-slate-600 dark:text-slate-300 font-medium
                hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
              "
            />
          </div>
        </div>

        {/* Action Button */}
        <AddNewEmployee onSuccess={handleAddEmployeeSuccess} />
      </div>
    </div>
  );
}

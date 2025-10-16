"use client";

import { DropdownSelection } from "@/components/DropDownSelection";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import DateRange from "@/components/DateRange";
import AddNewEmployee from "@/components/Lists/NewEmployee";
import { useEffect } from "react";
import { Search } from "lucide-react";

// filter component for /employee page
export default function EmployeeFilter() {
  const { setFilter, type } = useEmployeeFilterStore();

  useEffect(() => {
    setFilter({ search: "", dateRange: [null, null], type: "All" });
  }, []);
  return (
    <div className="flex flex-col items-end gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full flex-wrap items-center gap-x-8 gap-y-4 lg:w-fit">
        <div className="flex w-full items-center gap-x-2 rounded-md border border-gray-300 px-4 py-1 text-gray-400 lg:w-[500px]">
          <span>
            <Search className="w-5 h-5" />
          </span>
          <input
            name="search"
            type="text"
            className="w-full rounded-md px-4 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by employee ID, name, email or phone"
            onChange={(e) => setFilter({ search: e.target.value })}
          />
        </div>
        <div className="hidden gap-x-8 lg:flex">
          <DateRange
            onOk={(start, end) => setFilter({ dateRange: [start, end] })}
            onCancel={() => setFilter({ dateRange: [null, null] })}
          />

          <DropdownSelection
            dropDownValues={["All", "Sales", "Technician", "Manager", "Other"]}
            onValueChange={(value) => setFilter({ type: value as any })}
            changesValue={type}
            buttonClassName="min-w-[100px] shadow-md"
          />
        </div>
      </div>
      <AddNewEmployee />
    </div>
  );
}

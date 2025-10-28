"use client";

import { DropdownSelection } from "@/components/DropDownSelection";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import DateRange from "@/components/DateRange";
import AddNewEmployee from "@/components/Lists/NewEmployee";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import moment from "moment";

// filter component for /employee page
export default function EmployeeFilter({
  search,
  startDate,
  endDate,
  type,
}: {
  search?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
}) {
  const { setFilter } = useEmployeeFilterStore();
  const [searchInput, setSearchInput] = useState(search || "");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  console.log({ startDate, endDate, search, type });

  useEffect(() => {
    setFilter({
      search: search || "",
      dateRange:
        startDate && endDate
          ? [moment(startDate).toDate(), moment(endDate).toDate()]
          : [null, null],
      type: type ? (type as any) : "All",
    });
  }, [startDate, endDate, search, type]);

  const handleSearchChange = useDebounce((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    setFilter({ search: value });
    if (value === "" && params.has("search")) {
      params.delete("search");
      return;
    } else {
      params.set("search", value);
    }
    const queryString = params.toString();
    const newPathname = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newPathname);
  }, 500);

  const handleDateRangeChange = ([startDate, endDate]: any) => {
    setFilter({ dateRange: [startDate, endDate] });
    const params = new URLSearchParams(searchParams.toString());
    if (startDate && endDate) {
      params.set("startDate", startDate.toISOString().split("T")[0]);
      params.set("endDate", endDate.toISOString().split("T")[0]);
    } else {
      params.delete("startDate");
      params.delete("endDate");
    }
    const queryString = params.toString();
    const newPathname = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newPathname);
  };

  const handleCancelDateRange = () => {
    setFilter({ dateRange: [null, null] });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    const queryString = params.toString();
    const newPathname = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newPathname);
  };

  const handleEmployeeTypeChange = (value: string) => {
    setFilter({ type: value as any });
    const params = new URLSearchParams(searchParams.toString());
    if (value === "All") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    const queryString = params.toString();
    const newPathname = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newPathname);
  };
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
            value={searchInput}
            onChange={e => {
              setSearchInput(e.target.value);
              handleSearchChange(e.target.value.trim());
            }}
          />
        </div>
        <div className="hidden gap-x-8 lg:flex">
          <DateRange
            onOk={(start, end) => {
              setFilter({ dateRange: [start, end] });
              handleDateRangeChange([start, end]);
            }}
            onCancel={() => handleCancelDateRange()}
            startDate={moment(startDate || "").toDate() || null}
            endDate={moment(endDate || "").toDate() || null}
          />

          <DropdownSelection
            dropDownValues={["All", "Sales", "Technician", "Manager", "Other"]}
            onValueChange={handleEmployeeTypeChange}
            changesValue={type}
            buttonClassName="min-w-[100px] shadow-md"
          />
        </div>
      </div>
      <AddNewEmployee />
    </div>
  );
}

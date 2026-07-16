"use client";

import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import { Search as IoSearch } from "lucide-react";

export default function Search() {
  const { setFilter } = useEmployeeWorkFilterStore();
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="relative min-w-0 flex-1">
      <IoSearch className="w-5 h-5 absolute left-3 top-3 text-slate-400 dark:text-slate-300 transition-colors duration-300" />
      <input
        type="text"
        aria-label="Search"
        placeholder={`Search by ${pathname.includes("employee") ? "Invoice ID, Name, Vehicle" : "Name"}`}
        className="w-full border border-slate-300 ring-0 rounded-xl bg-transparent pr-3 pl-10 py-2 text-slate-600 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[0_8px_24px_rgba(101,113,255,0.08)] transition-all duration-300"
        onChange={(e) => {
          setFilter({ search: e.target.value });
        }}
      />
    </div>
  );
}

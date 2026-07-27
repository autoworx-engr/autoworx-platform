"use client";

import NewCustomer from "@/components/Lists/NewCustomer";
import { useDebounce } from "@/hooks/useDebounce";
import { useClientFilterStore } from "@/stores/clientFilter";
import { Search } from "lucide-react";
import React, { useEffect } from "react";
import { LeadUploadModal } from "./LeadUploadModal";

export default function Header() {
  const { setFilter } = useClientFilterStore();
  const [searchTerm, setSearchTerm] = React.useState("");
  useEffect(() => {
    setFilter({ search: "" });
  }, []);

  const handleSearchChange = useDebounce((value: string) => {
    setFilter({ search: value });
  }, 500);

  return (
    <div className="flex flex-col items-end gap-y-2 gap-x-4 md:flex-row md:items-center md:justify-between lg:gap-0">
      <div className="flex w-full items-center gap-x-8 bg-background md:w-[400px] xl:w-[500px]">
        <div
          className="
            group relative flex w-full items-center gap-x-3 rounded-xl
            bg-white dark:bg-slate-900 
            px-4 py-2 md:w-[400px] xl:w-[500px]
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
            placeholder="Search by Client ID, Name, Email or Phone..."
            value={searchTerm}
            onChange={(event) => {
              const value = event.target.value;
              handleSearchChange(value);
              setSearchTerm(value);
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LeadUploadModal
          buttonElement={
            <button
              className="
            flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
            bg-gradient-to-r from-primary to-[#5a66ee]
            shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
            hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
            hover:-translate-y-0.5
            active:translate-y-0 active:scale-100
            transition-all duration-300 ease-in-out
          "
            >
              + Upload Lead
            </button>
          }
        />
        <NewCustomer
          buttonElement={
            <button
              className="
            flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
            bg-gradient-to-r from-primary to-[#5a66ee]
            shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
            hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
            hover:-translate-y-0.5
            active:translate-y-0 active:scale-100
            transition-all duration-300 ease-in-out
          "
            >
              + Add New Client
            </button>
          }
        />
      </div>
    </div>
  );
}

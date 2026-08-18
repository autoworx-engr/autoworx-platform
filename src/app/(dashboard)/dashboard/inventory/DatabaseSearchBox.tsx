"use client";

import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore";
import { Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { debounce } from "../../../../utils/debounce";

export default function DatabaseSearchBox() {
  const [searchTerm, setSearchTerm] = useState("");

  const { setSearch, setPage } = useInventoryDatabaseSearchStore();

  const debouncedSearchRef = useRef(
    debounce((value: string) => {
      setSearch(value);
      setPage(1);
    }, 500),
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      debouncedSearchRef.current(value);
    },
    [],
  );

  return (
    <div className="w-full md:min-w-[300px] max-w-[693px]">
      <div className="group relative flex w-full items-center gap-x-3 rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 lg:w-[400px] ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 focus-within:shadow-md focus-within:shadow-indigo-500/5 hover:ring-slate-300 dark:hover:ring-slate-600">
        <span className="text-slate-400 group-focus-within:text-primary transition-colors duration-300">
          <Search className="w-4 h-4" />
        </span>

        <input
          type="text"
          placeholder="Search by Name, Category"
          className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
          value={searchTerm}
          onChange={handleInputChange}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
      </div>
    </div>
  );
}

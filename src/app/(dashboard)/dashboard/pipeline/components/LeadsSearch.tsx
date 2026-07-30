"use client";

import { cn } from "@/lib/cn";
import { Search } from "lucide-react";
import React, { useCallback } from "react";

const LeadsSearch = React.memo(function LeadsSearch({
  search,
  setSearch,
}: {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
}) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch],
  );

  return (
    <div className="relative min-w-0 flex-1 group">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
      />
      <input
        type="text"
        value={search}
        placeholder="Search by Client, Vehicle, Services..."
        onChange={handleSearchChange}
        className={cn(
          "w-full h-11 pl-12 pr-4 rounded-xl border  bg-white",
          "text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none",
          "transition-all duration-300 ease-in-out",
          "hover:border-slate-200 hover:bg-slate-50/30",
          "focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10",
        )}
      />
    </div>
  );
});

export default LeadsSearch;

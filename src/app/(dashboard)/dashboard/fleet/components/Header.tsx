"use client";

import React, { useEffect, useRef } from "react";
import NewFleet from "./NewFleet";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TProps = {
  initialSearch?: string;
};

export default function Header({ initialSearch = "" }: TProps) {
  const [searchTerm, setSearchTerm] = React.useState(initialSearch);
  const isTypingRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!isTypingRef.current) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  const handleSearchChange = useDebounce((value: string) => {
    isTypingRef.current = false;
    const searchParams = new URLSearchParams(params.toString());

    if (value.trim()) {
      searchParams.set("search", value.trim());
    } else {
      searchParams.delete("search");
    }

    // Reset to first page when changing search.
    searchParams.set("page", "1");

    const newPath = `${pathname}?${searchParams.toString()}`;
    router.replace(newPath);
  }, 500);

  return (
    <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
      <div className="flex w-full items-center gap-x-8 bg-background lg:w-fit">
        <div
          className="
            group relative flex w-full items-center gap-x-3 rounded-xl
            bg-white dark:bg-slate-900 
            px-4 py-2 lg:w-[400px] xl:w-[500px]
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
            placeholder="Search by Fleet ID, Name, Email or Phone..."
            value={searchTerm}
            onChange={(event) => {
              const value = event.target.value;
              isTypingRef.current = true;
              handleSearchChange(value);
              setSearchTerm(value);
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
      </div>
      <NewFleet
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
            + Add New Fleet
          </button>
        }
      />
    </div>
  );
}

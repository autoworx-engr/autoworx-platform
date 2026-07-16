"use client";
import { useDemoVendorFilterStore } from "@/stores/vendorFilter";
import { debounce } from "@/utils/debounce";
import { Search } from "lucide-react";
import { useCallback, useEffect } from "react";

export default function VendorHeader() {
  const { setSearchTerm } = useDemoVendorFilterStore();

  useEffect(() => {
    setSearchTerm("");
  }, []);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    [],
  );

  return (
    <div className="relative gap-x-8 bg-background min-w-[300px] max-w-[500px] mt-4 rounded-xl">
      {/* <form
        autoComplete="off"
        className="flex w-full items-center gap-x-2 rounded-md border border-gray-300 px-4 py-1 text-gray-400 lg:w-[500px]"
      > */}
      <span className="absolute left-[10px] top-[10px]">
        <Search className="w-5 h-5" />
      </span>
      <input
        name="search"
        type="text"
        className="w-full border border-slate-300 ring-0 rounded-xl bg-transparent pr-3 pl-10 py-2 text-slate-600 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[0_8px_24px_rgba(101,113,255,0.08)] transition-all duration-300"
        placeholder="Search by Client ID , Name, Website or Phone..."
        onChange={(e) => debouncedSearch(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      {/* </form> */}
    </div>
  );
}

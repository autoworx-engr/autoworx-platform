"use client";
import { useDemoVendorFilterStore } from "@/stores/vendorFilter";
import { debounce } from "@/utils/debounce";
import { Search } from "lucide-react";
import React, { useCallback, useEffect } from "react";

export default function VendorHeader() {
  const { setSearchTerm } = useDemoVendorFilterStore();

  useEffect(() => {
    setSearchTerm("");
  }, []);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  return (
    <div className="flex w-full items-center gap-x-8 bg-background lg:w-fit">
      <form
        autoComplete="off"
        className="flex w-full items-center gap-x-2 rounded-md border border-gray-300 px-4 py-1 text-gray-400 lg:w-[500px]"
      >
        <span className="">
          <Search className="w-5 h-5" />
        </span>
        <input
          name="search"
          type="text"
          className="w-full rounded-md border border-white px-4 py-1 focus:outline-none"
          placeholder="Search by client ID, name, website or phone..."
          onChange={(e) => debouncedSearch(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
}

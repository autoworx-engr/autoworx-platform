"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useActionStoreCreateEdit } from "@/stores/createEditStore";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimateFilterStore } from "@/stores/estimate-filter";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Filter } from "./Filter";

type THeaderProps = {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
};

export default function Header({
  searchTerm,
  startDate,
  endDate,
  status,
}: THeaderProps) {
  const { setFilter } = useEstimateFilterStore();
  const { setActionType } = useActionStoreCreateEdit();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const windowWidth = window.innerWidth;
  const inputRef = useRef<HTMLInputElement>(null);

  const { reset: resetEstimateCreate } = useEstimateCreateStore();
  const { reset: resetLists } = useListsStore();
  const { close } = useEstimatePopupStore();

  const isCanned = pathname === "/dashboard/estimate/canned";
  const isTemplate = pathname === "/dashboard/estimate/templates";

  const handleSearchChange = useDebounce((searchValue: string) => {
    const searchParams = new URLSearchParams(params.toString());
    searchParams.set("searchTerm", searchValue);
    if (searchValue === "" && searchParams.has("searchTerm")) {
      searchParams.delete("searchTerm");
    }
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
  }, 500);

  const handleClearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
    setFilter({ search: "" });
    handleSearchChange("");
  };

  return (
    <div
      // className={`mt-5 flex justify-between items-center flex-col-reverse gap-4 lg:gap-0 lg:flex-row`}

      className="mt-5 flex  gap-4 lg:flex-row lg:items-center flex-col-reverse lg:justify-between"
    >
      <div className="min-w-full lg:min-w-[500px] flex flex-row items-center gap-x-4 rounded-2xl bg-white p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
        {/* Search Container */}
        <div className="group relative flex min-w-0 flex-1 items-center">
          <Search
            size={18}
            className="absolute left-4 z-10 text-slate-400 transition-colors group-focus-within:text-primary"
          />

          <input
            ref={inputRef}
            type="text"
            placeholder={
              isTemplate
                ? "Search by Template ID, Title"
                : "Search by ID, client, vehicle, email..."
            }
            className="h-11 w-full rounded-xl border-none bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-all duration-300 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/30 outline-none md:max-w-[450px]"
            defaultValue={searchTerm || ""}
            onChange={(e) => {
              const searchValue = e.target.value;
              setFilter({ search: searchValue });
              handleSearchChange(searchValue);
            }}
          />

          {/* Clear search button */}
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter Section */}
        {!isCanned && (
          <div className="flex items-center gap-2 border-l border-slate-100 pl-3 md:pl-4">
            <Filter
              startDate={startDate}
              endDate={endDate}
              status={status}
              /* Ensure the Filter component interior matches the h-11 and rounded-xl style */
            />
          </div>
        )}
      </div>

      {/* Create Estimate */}
      <div className="flex items-end justify-end">
        {!isCanned && !isTemplate && (
          <Link
            href="/dashboard/estimate/create"
            className="
              flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white
              bg-gradient-to-r from-primary to-[#5a66ee]
              shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
              hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
              hover:-translate-y-0.5
              active:translate-y-0 active:scale-100
              transition-all duration-300 ease-in-out
            "
            onClick={() => {
              setActionType("create");

              resetEstimateCreate();
              resetLists();
              close();
            }}
          >
            + Create Estimate
          </Link>
        )}
        {isTemplate && (
          <Link
            href="/dashboard/estimate/templates/create"
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white
              bg-gradient-to-r from-primary to-[#5a66ee]
              shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
              hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
              hover:-translate-y-0.5
              active:translate-y-0 active:scale-100
              transition-all duration-300 ease-in-out"
            onClick={() => {
              setActionType("create");

              resetEstimateCreate();
              resetLists();
              close();
            }}
          >
            + Create Template
          </Link>
        )}
      </div>
    </div>
  );
}

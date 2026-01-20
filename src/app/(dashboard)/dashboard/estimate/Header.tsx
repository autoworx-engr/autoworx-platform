"use client";

import React from "react";
import { Filter } from "./Filter";
import Link from "next/link";
import { useEstimateFilterStore } from "@/stores/estimate-filter";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionStoreCreateEdit } from "@/stores/createEditStore";
import { useListsStore } from "@/stores/lists";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useDebounce } from "@/hooks/useDebounce";
import { Search } from "lucide-react";


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

  return (
    <div
      className={`mt-5 flex justify-between items-center flex-col-reverse gap-4 lg:gap-0 lg:flex-row`}
    >
      <div className="min-w-full lg:min-w-[500px] flex flex-col gap-x-4 rounded-2xl bg-white p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 md:flex-row md:items-center">
        {/* Search Container */}
        <div className="group relative flex flex-1 items-center">
          <Search
            size={18}
            className="absolute left-4 z-10 text-slate-400 transition-colors group-focus-within:text-[#6571FF]"
          />

          <input
            type="text"
            placeholder={
              isCanned
                ? "Search labor, service, category..."
                : "Search ID, name, vehicle, email..."
            }
            className="h-11 w-full rounded-xl border-none bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-all duration-300 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#6571FF]/30 outline-none md:max-w-[450px]"
            defaultValue={searchTerm || ""}
            onChange={(e) => {
              const searchValue = e.target.value;
              setFilter({ search: searchValue });
              handleSearchChange(searchValue);
            }}
          />

          {/* Subtle indicator for search activity (Optional) */}
          {searchTerm && (
            <div className="absolute right-3 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-[#6571FF]/10 text-[#6571FF]">
              <div className="h-1.5 w-1.5 rounded-full bg-[#6571FF]" />
            </div>
          )}
        </div>

        {/* Filter Section */}
        {!isCanned && (
          <div className="flex items-center gap-2 border-l border-slate-100 pl-0 md:pl-4">
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
              bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
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
              bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
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

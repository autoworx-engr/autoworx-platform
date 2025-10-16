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

  const { reset: resetEstimateCreate } = useEstimateCreateStore();
  const { reset: resetLists } = useListsStore();
  const { close } = useEstimatePopupStore();

  const isCanned = pathname === "/dashboard/estimate/canned";

  const handleSearchChange = useDebounce((searchValue: string) => {
    const searchParams = new URLSearchParams(params.toString());
    searchParams.set("searchTerm", searchValue);
    if (searchValue === "" && searchParams.has("searchTerm")) {
      searchParams.delete("searchTerm");
    }
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
  }, 500);

  console.log(pathname, "pathname in estimate header");

  return (
    <div className="mt-5 flex flex-col-reverse justify-between md:flex-row">
      <div className="app-shadow gap-3 rounded-md p-3 md:flex">
        {/* Search */}
        <div className="relative flex items-center">
          <Search size={20} className="absolute left-3 text-gray-400" />{" "}
          <input
            type="text"
            placeholder={
              isCanned
                ? "Search by labor, service, category"
                : "Search by ID, name, vehicle, email, or phone"
            }
            className="h-10 w-full rounded-md border-2 border-slate-400 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-600 md:w-[400px]"
            defaultValue={searchTerm || ""}
            onChange={(e) => {
              const searchValue = e.target.value;
              setFilter({ search: searchValue });
              handleSearchChange(searchValue);
            }}
          />
        </div>

        {!isCanned && (
          <Filter startDate={startDate} endDate={endDate} status={status} />
        )}
      </div>

      {/* Create Estimate */}
      {!isCanned && (
        <Link
          href="/dashboard/estimate/create"
          className="app-shadow mx-3 flex h-10 items-center justify-center rounded-md bg-[#6571FF] px-5 text-white md:mx-0 md:max-w-max"
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
    </div>
  );
}

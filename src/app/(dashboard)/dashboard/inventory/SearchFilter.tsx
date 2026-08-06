"use client";

import { DropdownSelection } from "@/components/DropDownSelection";
import { useDebounce } from "@/hooks/useDebounce";
import { useInventoryFilterStore } from "@/stores/inventoryFilter";
import { useListsStore } from "@/stores/lists";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type TSearchFilterProps = {
  searchParams: {
    category?: string;
    search?: string;
  };
};

export default function SearchFilter({ searchParams }: TSearchFilterProps) {
  const { category, setFilter } = useInventoryFilterStore();
  const { categories } = useListsStore();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Local state so a late-resolving (out-of-order) navigation from an
  // earlier keystroke can't overwrite text the user has since typed/deleted.
  const [search, setSearch] = useState(searchParams.search ?? "");

  // reset the category filter when the url category changes
  useEffect(() => {
    setFilter({ category: searchParams.category ?? "" });
  }, [searchParams.category]);

  const buildParams = () => {
    const searchParam = new URLSearchParams(params);
    searchParam.delete("page");
    return searchParam;
  };

  const handleSearchChange = useDebounce((value: string) => {
    const searchParam = buildParams();
    // console.log({ value });
    searchParam.set("search", value);
    if (value === "" && searchParam.has("search")) {
      searchParam.delete("search");
    }
    router.push(`${pathname}?${searchParam.toString()}`);
  }, 500);

  const handleCategoryChange = (value: string) => {
    setFilter({ category: value === "All Categories" ? "" : value });
    const searchParam = buildParams();
    if (value === "All Categories") {
      searchParam.delete("category");
    } else {
      searchParam.set("category", value);
    }
    router.push(`${pathname}?${searchParam.toString()}`);
  };

  const handleClearCategory = () => {
    setFilter({ category: "" });
    const searchParam = buildParams();
    if (searchParam.has("category")) {
      searchParam.delete("category");
    }
    router.push(`${pathname}?${searchParam.toString()}`);
  };

  return (
    <div className="my-3 flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-x-3">
      <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:space-x-4 w-full">
        <div className="group relative flex w-full items-center gap-x-3 rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 lg:w-[400px] ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 focus-within:shadow-md focus-within:shadow-indigo-500/5 hover:ring-slate-300 dark:hover:ring-slate-600">
          <span className="text-slate-400 group-focus-within:text-primary transition-colors duration-300">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Search by Name..."
            className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setSearch(value);
              handleSearchChange(value);
            }}
          />
        </div>
        <div className="w-fit md:w-auto">
          <DropdownSelection
            dropDownValues={[
              "All Categories",
              ...Array.from(new Set(categories.map((cate) => cate.name))),
            ]}
            onValueChange={handleCategoryChange}
            changesValue={category || "All Categories"}
            buttonClassName="md:w-60 shadow-md"
            showClearButton
            clearLabel="Clear filter"
            onClear={handleClearCategory}
          />
        </div>
      </div>
    </div>
  );
}

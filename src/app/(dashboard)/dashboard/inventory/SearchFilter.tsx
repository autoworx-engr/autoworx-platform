"use client";

import { DropdownSelection } from "@/components/DropDownSelection";
import { useDebounce } from "@/hooks/useDebounce";
import { useInventoryFilterStore } from "@/stores/inventoryFilter";
import { useListsStore } from "@/stores/lists";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FaSearch } from "react-icons/fa";

type TSearchFilterProps = {
  searchParams: {
    category?: string;
    search?: string;
  };
};

export default function SearchFilter({ searchParams }: TSearchFilterProps) {
  const { search, category, setFilter } = useInventoryFilterStore();
  const { categories } = useListsStore();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // reset the filter when the search changes
  // useEffect(() => {
  //   setFilter({
  //     search: searchParams.search ?? "",
  //     category: searchParams.category ?? "",
  //   });
  // }, [searchParams.search, searchParams.category]);

  const handleSearchChange = useDebounce((value: string) => {
    const searchParam = new URLSearchParams(params);
    console.log({ value });
    searchParam.set("search", value);
    if (value === "" && searchParam.has("search")) {
      searchParam.delete("search");
    }
    router.push(`${pathname}?${searchParam.toString()}`);
  }, 500);

  const handleCategoryChange = (value: string) => {
    setFilter({ category: value === "All Categories" ? "" : value });
    const searchParam = new URLSearchParams(params);
    if (value === "All Categories" && searchParam.has("category")) {
      searchParam.delete("category");
    } else {
      searchParam.set("category", value);
    }
    router.push(`${pathname}?${searchParam.toString()}`);
  };

  return (
    <div className="flex w-full items-center justify-between gap-5">
      <div className="relative w-full">
        <FaSearch className="absolute top-1/2 ml-2 -translate-y-1/2 text-lg text-slate-400" />
        <input
          type="text"
          className="h-10 w-full rounded-md border-2 border-slate-400 p-1 px-3 pl-8 lg:w-[70%]"
          placeholder="Search by name"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setFilter({ search: value });
            handleSearchChange(value);
          }}
        />
      </div>
      <div className="hidden lg:block">
        <DropdownSelection
          dropDownValues={[
            "All Categories",
            ...Array.from(new Set(categories.map((cate) => cate.name))),
          ]}
          onValueChange={handleCategoryChange}
          changesValue={category || "All Categories"}
          buttonClassName="md:w-60 shadow-md"
        />
      </div>
    </div>
  );
}

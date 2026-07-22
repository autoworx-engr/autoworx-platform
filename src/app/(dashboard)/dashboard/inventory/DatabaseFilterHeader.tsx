"use client";

import { DropdownSelection } from "@/components/DropDownSelection";
import { useEffect, useState } from "react";
import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore";
import DatabaseSearchBox from "./DatabaseSearchBox";

type TProps = {
  categories: any[];
};

export default function DatabaseFilterHeader({ categories = [] }: TProps) {
  const { setSearch, setPage, categoryName, setCategoryName } =
    useInventoryDatabaseSearchStore();

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    categoryName,
  );

  const handleCategoryChange = (value: string) => {
    if (value === "All Categories") {
      setSelectedCategory(undefined);
      setCategoryName("");
    } else {
      setSelectedCategory(value);
      setCategoryName(value ?? "");
    }
    setPage(1);
  };

  const handleClearCategory = () => {
    setSelectedCategory(undefined);
    setCategoryName("");
    setPage(1);
  };

  useEffect(() => {
    setSelectedCategory(categoryName);
  }, [categoryName]);

  return (
    <div className="m-3 flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-x-3">
      <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:space-x-4">
        <div className="relative w-full md:min-w-[300px] md:max-w-[693px]">
          <DatabaseSearchBox />
        </div>
        <div className="w-fit md:w-auto">
          <DropdownSelection
            dropDownValues={["All Categories", ...categories]}
            onValueChange={handleCategoryChange}
            changesValue={selectedCategory || "All Categories"}
            defaultValue="All Categories"
            buttonClassName="md:w-[200px]"
            showClearButton
            clearLabel="Clear filter"
            onClear={handleClearCategory}
          />
        </div>
      </div>
    </div>
  );
}

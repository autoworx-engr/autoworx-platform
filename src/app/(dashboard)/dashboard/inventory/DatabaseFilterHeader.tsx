"use client";

import { Select } from "antd";
import { useEffect, useState } from "react";
import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore";
import DatabaseSearchBox from "./DatabaseSearchBox";

type TProps = {
  categories: any[];
};

export default function DatabaseFilterHeader({ categories }: TProps) {
  const categoryName = useInventoryDatabaseSearchStore((state) => state.categoryName);
  const setCategoryName = useInventoryDatabaseSearchStore((state) => state.setCategoryName);

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryName);

  const handleCategoryChange = (value: string | undefined) => {
    setSelectedCategory(value);
    setCategoryName(value ?? "");
  };

  useEffect(() => {
    setSelectedCategory(categoryName);
  }, [categoryName]);

  return (
    <div className="my-3 flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-x-3">
      <div className="flex flex-col gap-2 md:flex-1 md:flex-row md:items-center md:space-x-4">
        <div className="relative w-full md:min-w-[300px] md:max-w-[693px]">
          <DatabaseSearchBox />
        </div>
        <div className="w-full md:w-auto">
          <Select
            placeholder="Category"
            value={selectedCategory || undefined}
            onChange={handleCategoryChange}
            className="w-full md:w-[150px]"
            allowClear
          >
            <Select.Option value="">All Categories</Select.Option>
            {categories.map((category, index) => (
              <Select.Option key={index} value={category}>
                {category}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

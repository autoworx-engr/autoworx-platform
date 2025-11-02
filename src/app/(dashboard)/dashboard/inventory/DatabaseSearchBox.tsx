"use client";

import { Input } from "antd";
import { useCallback, useRef, useState } from "react";
import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore";
import { Search } from "lucide-react";
import { debounce } from "../../../../utils/debounce";

export default function DatabaseSearchBox() {
  const [searchTerm, setSearchTerm] = useState("");

  const { setSearch, setPage } = useInventoryDatabaseSearchStore();

  const debouncedSearchRef = useRef(
    debounce((value: string) => {
      setSearch(value);
      setPage(1);
    }, 500)
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      debouncedSearchRef.current(value);
    },
    []
  );

  return (
    <div className="w-full min-w-[300px] max-w-[693px]">
      <Input
        onChange={handleInputChange}
        value={searchTerm}
        className="w-full rounded-sm border focus:outline-none"
        type="text"
        placeholder="Search by name"
        prefix={<Search size={15} className="text-gray-400" />}
      />
    </div>
  );
}

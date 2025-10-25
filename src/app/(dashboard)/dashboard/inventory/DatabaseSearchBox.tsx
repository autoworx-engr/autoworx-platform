"use client";

import { Input } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore";
import { Search } from "lucide-react";
import { debounce } from "../../../../utils/debounce";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";

export default function DatabaseSearchBox() {
  const [searchTerm, setSearchTerm] = useState("");

  const { search, setSearch, setPage } = useInventoryDatabaseSearchStore();

  useEffect(() => {
    setSearchTerm(search || "");
  }, [search]);

  const debouncedSearch = useDebounceCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, 500);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

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

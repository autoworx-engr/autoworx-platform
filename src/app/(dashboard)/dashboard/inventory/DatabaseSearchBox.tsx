"use client";

import { CiSearch } from "react-icons/ci";
import { Input } from "antd";
import { useEffect, useState } from "react";
import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore";
import { useDebouncedCallback } from "@/utils/useDebouncedCallback";

export default function DatabaseSearchBox() {
  const [searchTerm, setSearchTerm] = useState("");

  const { search, setSearch, setPage } = useInventoryDatabaseSearchStore();

  useEffect(() => {
    setSearchTerm(search || "");
  }, [search]);

  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    500,
    [setSearch]
  );

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
        prefix={<CiSearch size={15} />}
      />
    </div>
  );
}

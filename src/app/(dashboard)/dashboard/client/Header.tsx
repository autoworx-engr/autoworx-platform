"use client";

import NewCustomer from "@/components/Lists/NewCustomer";
import { useDebounce } from "@/hooks/useDebounce";
import { useClientFilterStore } from "@/stores/clientFilter";
import { Search } from "lucide-react";
import React, { useEffect } from "react";

export default function Header() {
  const { setFilter } = useClientFilterStore();
  const [searchTerm, setSearchTerm] = React.useState("");

  useEffect(() => {
    setFilter({ search: "" });
  }, []);

  const handleSearchChange = useDebounce((value: string) => {
    setFilter({ search: value });
  }, 500);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
      <div className="flex w-full items-center gap-x-8 bg-background lg:w-fit">
        <div className="flex w-full items-center gap-x-2 rounded-md border border-gray-300 px-4 py-1 text-gray-400 lg:w-[500px]">
          <span className="">
            <Search className="w-5 h-5" />
          </span>
          <input
            name="search"
            type="text"
            className="w-full rounded-md border border-white px-4 py-1 focus:outline-none"
            placeholder="Search by client ID, name, email or phone..."
            value={searchTerm}
            onChange={event => {
              const value = event.target.value;
              handleSearchChange(value);
              setSearchTerm(value);
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
      </div>
      <NewCustomer
        buttonElement={
          <button className="w-fit self-end rounded-md bg-[#6571FF] p-2 px-5 text-white">
            + Add New Client
          </button>
        }
      />
    </div>
  );
}

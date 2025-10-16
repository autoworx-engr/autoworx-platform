"use client";

import { useClientFilterStore } from "@/stores/clientFilter";
import React, { useEffect } from "react";
import NewFleet from "./NewFleet";
import { Search } from "lucide-react";

export default function Header() {
  const { setFilter } = useClientFilterStore();

  useEffect(() => {
    setFilter({ search: "" });
  }, []);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
      <div className="flex w-full items-center gap-x-8 bg-background lg:w-fit">
        <div className="flex w-full items-center gap-x-2 rounded-md border border-gray-300 px-4 py-1 text-gray-400 lg:w-[500px]">
          <span className="">
            <Search size={20} />
          </span>
          <input
            name="search"
            type="text"
            className="w-full rounded-md border border-white px-4 py-1 focus:outline-none"
            placeholder="Search by id, name, email, phone..."
            onChange={(e) => setFilter({ search: e.target.value })}
          />
        </div>
      </div>
      <NewFleet
        buttonElement={
          <button className="w-fit self-end rounded-md bg-[#6571FF] p-2 px-5 text-white">
            + Add New Fleet
          </button>
        }
      />
    </div>
  );
}

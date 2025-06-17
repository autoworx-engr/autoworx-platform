"use client";
import { useDebounce } from "@/hooks/useDebounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { IoCloseOutline } from "react-icons/io5";

type TSearchSectionProps = {
  searchValue?: string;
};

export default function SearchSection({
  searchValue = "",
}: TSearchSectionProps) {
  const [searchTerm, setSearchTerm] = useState<string>(searchValue);
  const router = useRouter();
  const pathname = usePathname() || "";
  const params = useSearchParams();

  const handleSearchChange = useDebounce((value: string) => {
    const searchParams = new URLSearchParams(params.toString());
    searchParams.set("searchTerm", value);

    if (value.trim() === "" && searchParams.has("searchTerm")) {
      searchParams.delete("searchTerm");
    }
    router.push(`${pathname}?${searchParams.toString()}`);
  }, 500);

  const handleClearSearch = () => {
    setSearchTerm("");
    const searchParams = new URLSearchParams(params.toString());
    if (searchParams.has("searchTerm")) {
      searchParams.delete("searchTerm");
    }
    router.push(`${pathname}?${searchParams.toString()}`);
  };
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Search input */}
      <div className="flex h-10 w-full items-center rounded-md border px-3 sm:w-auto">
        <FiSearch className="mr-2 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => {
            const value = event.target.value;
            handleSearchChange(value);
            setSearchTerm(value);
          }}
          placeholder="Search by client name..."
          className="h-full w-[510px] flex-grow border-none bg-transparent text-sm outline-none"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <IoCloseOutline size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

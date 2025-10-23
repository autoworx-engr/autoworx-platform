"use client";
import { useDebounce } from "@/hooks/useDebounce";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
type TProps = {
  searchText: string;
  paramKey?: string; // 👈 unique key: "serviceSearch" or "laborSearch"
};
export default function FilterBySearchBox({ searchText, paramKey }: TProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (searchText) {
      setSearchTerm(searchText);
    }
  }, []);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    const searchParams = new URLSearchParams(params!);
    if (searchTerm === "") {
      if (paramKey) {
        searchParams.delete(paramKey);
      } else {
        searchParams.delete("search");
      }
    } else {
      if (paramKey) {
        searchParams.set(paramKey, searchTerm);
      } else {
        searchParams.set("search", searchTerm);
      }
    }
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.replace(newPath);
  };
  const handleSearchChange = useDebounce(handleInputChange, 500);

  const getPlaceholderForPath = () => {
    if (pathname.includes("revenue")) {
      return "Search by invoice, customer, vehicle";
    } else if (pathname.includes("inventory")) {
      return "Search by name";
    } else if (pathname.includes("payments")) {
      return "Search by invoice, client, vehicle";
    } else if (pathname.includes("teams")) {
      return "Search by employee name";
    } else {
      return "Search";
    }
  };

  return (
    <div className="relative w-full min-w-[300] max-w-[693px]">
      <Search size={16} className="absolute left-[10px] top-[9px]" />
      <input
        onChange={(e) => {
          handleSearchChange(e);
          setSearchTerm(e.target.value);
        }}
        value={searchTerm}
        className="w-full rounded-sm border py-1 pl-8 focus:outline-none"
        type="text"
        placeholder={getPlaceholderForPath() + "..."}
      />
    </div>
  );
}

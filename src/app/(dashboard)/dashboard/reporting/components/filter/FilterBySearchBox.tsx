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

    // Keep canned list pagination behavior stable when search changes.
    if (paramKey === "laborSearch") {
      searchParams.set("laborPage", "1");
    }
    if (paramKey === "serviceSearch") {
      searchParams.set("servicePage", "1");
    }

    const newPath = `${pathname}?${searchParams.toString()}`;
    router.replace(newPath);
  };
  const handleSearchChange = useDebounce(handleInputChange, 500);

  const getPlaceholderForPath = () => {
    if (pathname.includes("revenue")) {
      return "Search by Invoice, Customer or Vehicle";
    } else if (pathname.includes("inventory")) {
      return "Search by Name";
    } else if (pathname.includes("payments")) {
      return "Search by Invoice, Client or Vehicle";
    } else if (pathname.includes("teams")) {
      return "Search by Employee Name";
    } else if (paramKey === "laborSearch") {
      return "Search by Labor Name or Category";
    } else if (paramKey === "serviceSearch") {
      return "Search by Service Name or Category";
    } else {
      return "Search";
    }
  };

  return (
    <div className="relative w-full min-w-[300] max-w-[693px]">
      <Search size={20} className="absolute left-[10px] top-[10px]" />
      <input
        onChange={(e) => {
          handleSearchChange(e);
          setSearchTerm(e.target.value);
        }}
        value={searchTerm}
        className="w-full border border-slate-300 ring-0 rounded-xl bg-transparent pr-3 pl-10 py-2 text-slate-600 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6571FF] focus:shadow-[0_8px_24px_rgba(101,113,255,0.08)] transition-all duration-300"
        type="text"
        placeholder={getPlaceholderForPath()}
      />
    </div>
  );
}

"use client";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

  // Always-current params ref so the debounce callback never reads a stale closure
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Track the last value we pushed to the URL so we can tell the difference
  // between our own URL updates and external ones (e.g. "Clear all filters")
  const lastPushedRef = useRef(searchValue);

  useEffect(() => {
    // Only sync URL → input when the change came from outside this component
    if (searchValue !== lastPushedRef.current) {
      setSearchTerm(searchValue);
      lastPushedRef.current = searchValue;
    }
  }, [searchValue]);

  const handleSearchChange = useDebounce((value: string) => {
    const searchParams = new URLSearchParams(paramsRef.current.toString());
    if (value.trim() === "") {
      searchParams.delete("searchTerm");
    } else {
      searchParams.set("searchTerm", value);
    }
    lastPushedRef.current = value.trim();
    router.push(`${pathname}?${searchParams.toString()}`);
  }, 500);

  const handleClearSearch = () => {
    setSearchTerm("");
    const searchParams = new URLSearchParams(paramsRef.current.toString());
    searchParams.delete("searchTerm");
    lastPushedRef.current = "";
    router.push(`${pathname}?${searchParams.toString()}`);
  };
  return (
    <div className="relative group flex flex-1 h-10 max-w-lg items-center rounded-md sm:w-auto ml-2">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
      />
      <input
        type="text"
        value={searchTerm}
        onChange={(event) => {
          const value = event.target.value;
          handleSearchChange(value);
          setSearchTerm(value);
        }}
        placeholder="Search by Name or Vehicle..."
        className={cn(
          "w-full h-11 pl-12 pr-4 rounded-xl border-2 border-slate-100 bg-white",
          "text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none",
          "transition-all duration-300 ease-in-out",
          "hover:border-slate-200 hover:bg-slate-50/30",
          "focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10",
        )}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      {searchTerm && (
        <button
          onClick={handleClearSearch}
          className="absolute right-3 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg p-1 transition-colors"
        >
          <X size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

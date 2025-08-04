"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { useDemoClientFilterStore } from "@/stores/clientFilter";
import { useEffect } from "react";

type TProps = {
  search?: string;
  filter?: string;
};

export default function ClientFilter() {
  // const router = useRouter();
  // const pathname = usePathname();
  // const searchParams = useSearchParams();
  const { filter, setFilter, setSearchTerm, searchTerm } =
    useDemoClientFilterStore();

  const handleSearch = useDebounce((searchTerm: string) => {
    // if (searchParams) {
    //   const params = new URLSearchParams(searchParams);
    //   if (searchTerm === "" && params.has("search")) {
    //     params.delete("search");
    //   } else {
    //     params.set("search", searchTerm);
    //   }
    //   router.replace(`${pathname}?${params.toString()}`);
    // }
    setSearchTerm(searchTerm);
  }, 300);

  const handleFilterChange = (filter: string) => {
    // if (searchParams) {
    //   const params = new URLSearchParams(searchParams);
    //   params.set("filter", filter);
    //   if (filter === "All" && params.has("filter")) {
    //     params.delete("filter");
    //   }
    //   const redirectPath = `${pathname}?${params.toString()}`;
    //   router.replace(redirectPath);
    // }
    setFilter(filter);
  };

  useEffect(() => {
    setSearchTerm("");
  }, []);

  return (
    <>
      <div className="w-full">
        <input
          type="text"
          placeholder="Search here..."
          
          className="my-6 mr-2 w-full rounded-md border border-emerald-700 p-2 text-[16px] text-[#797979]"
          style={{
            WebkitAppearance: "none",
            maxHeight: "100%",
            WebkitTextSizeAdjust: "100%",
            touchAction: "manipulation", // Helps with tap delays in PWAs
          }}
          onChange={(e) => handleSearch(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            handleFilterChange("All");
          }}
          className={cn(
            `rounded-md border-2 border-[#006D77] px-2 py-1 text-xs`,
            filter === "All" ? "bg-[#006D77] text-white" : "text-[#006D77]",
          )}
        >
          All
        </button>
        <button
          onClick={() => {
            handleFilterChange("Unread");
          }}
          className={cn(
            `rounded-md border-2 border-[#006D77] px-2 py-1 text-xs`,
            filter === "Unread" ? "bg-[#006D77] text-white" : "text-[#006D77]",
          )}
        >
          Unread
        </button>
        <button
          onClick={() => {
            handleFilterChange("Starred");
          }}
          className={cn(
            `rounded-md border-2 border-[#006D77] px-2 py-1 text-xs`,
            filter === "Starred" ? "bg-[#006D77] text-white" : "text-[#006D77]",
          )}
        >
          Starred
        </button>
        <button
          onClick={() => {
            handleFilterChange("Assigned");
          }}
          className={cn(
            `rounded-md border-2 border-[#006D77] px-2 py-1 text-xs`,
            filter === "Assigned"
              ? "bg-[#006D77] text-white"
              : "text-[#006D77]",
          )}
        >
          Assigned To Me
        </button>
      </div>
    </>
  );
}

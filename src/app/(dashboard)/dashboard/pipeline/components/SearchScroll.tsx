import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { EmployeeType } from "@prisma/client";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Funnel,
  Search,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

interface SearchScrollProps {
  pipelineData: any[];
  onSearchResult?: (
    result: { columnIndex: number; leadIndex: number } | null,
  ) => void;
  setSearchTerm?: (term: string) => void;
  onColumnChange?: (columnId: number | null) => void;
  isTeamPipeline?: boolean;
  employeeType?: EmployeeType;
}

export default function SearchScroll({
  pipelineData,
  onSearchResult,
  onColumnChange,
  isTeamPipeline = false,
  employeeType,
}: SearchScrollProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlSearch = searchParams?.get("search") ?? "";
  const [searchTerm, setSearchTerm] = useState<string>(urlSearch);
  const [searchResults, setSearchResults] = useState<
    { columnIndex: number; leadIndex: number }[]
  >([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [showColumnFilter, setShowColumnFilter] = useState<boolean>(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<EmployeeType | undefined>(
    employeeType,
  );
  const filterRef = useRef<HTMLDivElement>(null);

  // Always-current searchParams ref so the debounce callback never reads a stale closure
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  // Track the last value we pushed to the URL to distinguish self-pushes from
  // external URL changes (e.g. another component clearing filters)
  const lastPushedRef = useRef(urlSearch);

  // Only sync URL → input when the change came from outside this component
  useEffect(() => {
    if (urlSearch !== lastPushedRef.current) {
      setSearchTerm(urlSearch);
      lastPushedRef.current = urlSearch;
    }
  }, [urlSearch]);

  const handleSearchChange = useDebounce((value: string) => {
    const params = new URLSearchParams(
      searchParamsRef.current?.toString() ?? "",
    );
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    lastPushedRef.current = value;
    startTransition(() => {
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
      );
    });
  }, 500);

  // Handle clicks outside filter dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowColumnFilter(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Perform search when searchTerm or selectedColumnId changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      if (onSearchResult) onSearchResult(null);
      return;
    }

    const results: { columnIndex: number; leadIndex: number }[] = [];

    // Search through columns and leads based on filter
    pipelineData.forEach((column, columnIndex) => {
      // Skip if column filter is active and this column doesn't match
      if (selectedColumnId !== null && column.id !== selectedColumnId) {
        return;
      }
      // Unified search logic for both pipelines
      const words = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      const matchesAllWords = (haystack: string) =>
        words.every((w) => haystack.includes(w));

      column.leads?.forEach((lead: any, leadIndex: number) => {
        const nameStr = (lead.name || lead.clientName || "").toLowerCase();
        const vehicleStr = (lead.vehicle || "").toLowerCase();

        if (matchesAllWords(nameStr) || matchesAllWords(vehicleStr)) {
          results.push({ columnIndex, leadIndex });
        }
      });
    });

    setSearchResults(results);
    setCurrentResultIndex(0);

    // Notify parent of first result (if exists)
    if (results.length > 0 && onSearchResult) {
      onSearchResult(results[0]);
    } else if (onSearchResult) {
      onSearchResult(null);
    }
  }, [searchTerm, selectedColumnId, pipelineData, onSearchResult]);

  // Navigate to next result
  const handleNextResult = () => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);

    if (onSearchResult) {
      onSearchResult(searchResults[nextIndex]);
    }
  };

  // Navigate to previous result
  const handlePrevResult = () => {
    if (searchResults.length === 0) return;

    const prevIndex =
      (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);

    if (onSearchResult) {
      onSearchResult(searchResults[prevIndex]);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    lastPushedRef.current = "";
    // Cancel any pending debounce so it doesn't re-add the search param after we clear it
    handleSearchChange("");
    const params = new URLSearchParams(
      searchParamsRef.current?.toString() ?? "",
    );
    params.delete("search");
    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
    );
    if (onSearchResult) onSearchResult(null);
  };

  // Clear column filter
  const handleClearFilter = () => {
    setSelectedColumnId(null);
    setSelectedType(undefined);
    if (onColumnChange) onColumnChange(null);
    setShowColumnFilter(false);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  // Toggle column filter dropdown
  const toggleColumnFilter = () => {
    setShowColumnFilter(!showColumnFilter);
  };

  // Select a column to filter by
  const selectColumn = (columnId: number) => {
    setSelectedColumnId(columnId);
    if (onColumnChange) onColumnChange(columnId);
    setShowColumnFilter(false);
  };

  const selectType = (type: EmployeeType) => {
    setSelectedType(type);
    setShowColumnFilter(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-background p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between mx-2">
      {/* Search input */}
      <div className="relative group flex flex-1 h-10 max-w-lg items-center rounded-md sm:w-auto">
        {
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
          />
        }
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => {
            const value = event.target.value;
            handleSearchChange(value);
            setSearchTerm(value);
          }}
          placeholder="Search by Client Name or Vehicle"
          className={cn(
            "w-full h-11 pl-12 pr-4 rounded-xl border-2 border-slate-100 bg-white",
            "text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none",
            "transition-all duration-300 ease-in-out",
            "hover:border-slate-200 hover:bg-slate-50/30",
            "focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10",
          )}
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg p-1 transition-colors"
          >
            <X size={18} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Filter & Navigation Container */}
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
        {/* Column filter button */}
        {!isTeamPipeline ? (
          <div className="relative" ref={filterRef}>
            <button
              onClick={toggleColumnFilter}
              className={cn(
                "flex h-12 w-full items-center gap-2 rounded-2xl border-2 px-4 transition-all duration-200 sm:w-auto",
                "text-sm font-semibold outline-none active:scale-95",
                selectedColumnId !== null || showColumnFilter
                  ? "border-primary/40 bg-primary/5 text-primary ring-4 ring-primary/10"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50",
              )}
              aria-label="Filter by column"
            >
              <Funnel
                size={16}
                className={
                  selectedColumnId !== null || showColumnFilter
                    ? "text-primary"
                    : "text-slate-400"
                }
              />
              <span>
                {selectedColumnId !== null
                  ? pipelineData.find((col) => col.id === selectedColumnId)
                      ?.title || "Column"
                  : "All Columns"}
              </span>
              <ChevronDown size={14} className="ml-1 opacity-50" />
            </button>

            {/* Dropdown */}
            {showColumnFilter && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-slate-50 bg-white p-2 shadow-[0_20px_50px_rgba(101,113,255,0.12)] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleClearFilter}
                    className={cn(
                      "flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedColumnId === null
                        ? "bg-primary text-white"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    All Columns
                  </button>

                  {pipelineData.map((column: any) => (
                    <button
                      key={column.id}
                      onClick={() => selectColumn(column.id)}
                      className={cn(
                        "flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors",
                        selectedColumnId === column.id
                          ? "bg-primary text-white"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {column.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative" ref={filterRef}>
            <button
              onClick={toggleColumnFilter}
              className={cn(
                "flex h-12 w-full items-center gap-2 rounded-2xl border-2 px-4 transition-all duration-200 sm:w-auto",
                "text-sm font-semibold outline-none active:scale-95",
                selectedType !== null
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50",
              )}
              aria-label="Filter by Type"
            >
              <Funnel
                size={16}
                className={
                  selectedType !== undefined ? "text-primary" : "text-slate-400"
                }
              />
              <span>
                {selectedType !== undefined
                  ? selectedType || "Column"
                  : "All Type"}
              </span>
              <ChevronDown size={14} className="ml-1 opacity-50" />
            </button>

            {/* Dropdown */}
            {showColumnFilter && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-slate-50 bg-white p-2 shadow-[0_20px_50px_rgba(101,113,255,0.12)] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleClearFilter}
                    className={cn(
                      "flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedType === undefined
                        ? "bg-primary text-white"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    All Type
                  </button>

                  {["Admin", "Manager", "Sales", "Technician", "Other"].map(
                    (type: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => selectType(type)}
                        className={cn(
                          "flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors",
                          selectedType === type
                            ? "bg-primary text-white"
                            : "text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        {type}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search result navigation - Refined Navigation UI */}
        {searchResults.length > 0 && (
          <div className="flex h-12 items-center justify-between gap-1 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-3 shadow-sm">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
              <span className="text-xs font-semibold text-primary">
                {currentResultIndex + 1}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                of {searchResults.length}
              </span>
            </div>

            <div className="flex gap-1">
              <button
                onClick={handlePrevResult}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-all hover:bg-primary hover:text-white active:scale-90"
                aria-label="Previous result"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={handleNextResult}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-all hover:bg-primary hover:text-white active:scale-90"
                aria-label="Next result"
              >
                <ArrowDown size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

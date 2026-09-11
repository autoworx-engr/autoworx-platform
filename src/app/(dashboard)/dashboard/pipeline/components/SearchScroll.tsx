import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import SearchScrollFilters, { SelectedEmployee } from "./SearchScrollFilters";

interface SearchScrollProps {
  pipelineData: any[];
  onSearchResult?: (
    result: { columnIndex: number; leadIndex: number } | null,
  ) => void;
  setSearchTerm?: (term: string) => void;
  onColumnChange?: (columnId: number | null) => void;
  isTeamPipeline?: boolean;
  selectedEmployee?: SelectedEmployee | null;
}

export default function SearchScroll({
  pipelineData,
  onSearchResult,
  onColumnChange,
  isTeamPipeline = false,
  selectedEmployee,
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
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);

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

  const handleSelectColumn = (columnId: number | null) => {
    setSelectedColumnId(columnId);
    if (onColumnChange) onColumnChange(columnId);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-background p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between mx-2">
      {/* Search input */}
      <div className="relative group flex flex-1 h-10 max-w-lg items-center rounded-md sm:w-auto">
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
          placeholder="Search by Client Name or Vehicle"
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
            <X size={18} strokeWidth={3} />
          </button>
        )}
      </div>

      <SearchScrollFilters
        pipelineData={pipelineData}
        isTeamPipeline={isTeamPipeline}
        selectedColumnId={selectedColumnId}
        onSelectColumn={handleSelectColumn}
        selectedEmployee={selectedEmployee}
        resultCount={searchResults.length}
        currentResultIndex={currentResultIndex}
        onPrevResult={handlePrevResult}
        onNextResult={handleNextResult}
      />
    </div>
  );
}

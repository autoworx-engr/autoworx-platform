import { useDebounce } from "@/hooks/useDebounce";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import { Funnel, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SearchScrollProps {
  pipelineData: any[];
  onSearchResult?: (
    result: { columnIndex: number; leadIndex: number } | null
  ) => void;
  setSearchTerm?: (term: string) => void;
}

export default function SearchScroll({
  pipelineData,
  onSearchResult,
}: SearchScrollProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    { columnIndex: number; leadIndex: number }[]
  >([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [showColumnFilter, setShowColumnFilter] = useState<boolean>(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // const queryClient = useQueryClient();

  const pathname = usePathname() || "";
  const isSalesPipeline = pathname.includes(
    "/dashboard/pipeline/sales/pipeline"
  );

  const handleSearchChange = useDebounce(async (value: string) => {
    try {
      usePipelineFilterStore.setState({ searchTerm: value || "" });
    } catch (err) {
      // console.error("Error in handleSearchChange:", err);
    }
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
      column.leads?.forEach((lead: any, leadIndex: number) => {
        // Search by client name
        const nameMatch = (lead.name || lead.clientName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        // Search by vehicle information (year, make, model)
        const vehicleMatch =
          lead.vehicle &&
          lead.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
        const vehicleYearMatch =
          lead.year &&
          lead.year.toLowerCase().includes(searchTerm.toLowerCase());
        if (nameMatch || vehicleMatch || vehicleYearMatch) {
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
    usePipelineFilterStore.setState({ searchTerm: "" });
    if (onSearchResult) onSearchResult(null);
  };

  // Clear column filter
  const handleClearFilter = () => {
    setSelectedColumnId(null);
  };

  // Toggle column filter dropdown
  const toggleColumnFilter = () => {
    setShowColumnFilter(!showColumnFilter);
  };

  // Select a column to filter by
  const selectColumn = (columnId: number) => {
    setSelectedColumnId(columnId);
    setShowColumnFilter(false);
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Search input */}
      <div className="flex h-10 w-full items-center rounded-md border px-3 sm:w-auto">
        <Search size={18} className="mr-2 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => {
            const value = event.target.value;
            handleSearchChange(value);
            setSearchTerm(value);
          }}
          placeholder="Search by Client Name or Vehicle"
          className="h-full w-[510px] flex-grow border-none bg-transparent text-sm outline-none"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Filter & Navigation Container */}
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
        {/* Column filter button */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={toggleColumnFilter}
            className={`flex w-full items-center rounded-md border px-3 py-2 hover:bg-gray-100 sm:w-auto ${
              selectedColumnId !== null ? "bg-blue-50 text-blue-600" : ""
            }`}
            aria-label="Filter by column"
          >
            <Funnel size={16} className="mr-1" />
            <span className="text-sm">
              {selectedColumnId !== null
                ? pipelineData.find((col) => col.id === selectedColumnId)
                    ?.title || "Column"
                : "All Columns"}
            </span>
          </button>

          {/* Dropdown */}
          {showColumnFilter && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-background shadow-lg">
              <div className="py-1">
                <button
                  onClick={handleClearFilter}
                  className={`flex w-full items-center px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                    selectedColumnId === null ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  All Columns
                </button>
                {pipelineData.map((column: any) => (
                  <button
                    key={column.id}
                    onClick={() => selectColumn(column.id)}
                    className={`flex w-full items-center px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      selectedColumnId === column.id
                        ? "bg-blue-50 text-blue-600"
                        : ""
                    }`}
                  >
                    {column.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search result navigation */}
        {searchResults.length > 0 && (
          <div className="flex items-center justify-between px-2 text-sm text-gray-500">
            <span>
              {currentResultIndex + 1} of {searchResults.length}
            </span>
            <div className="ml-2 flex">
              <button
                onClick={handlePrevResult}
                className="mx-1 rounded p-1 hover:bg-gray-100"
                aria-label="Previous result"
              >
                ↑
              </button>
              <button
                onClick={handleNextResult}
                className="mx-1 rounded p-1 hover:bg-gray-100"
                aria-label="Next result"
              >
                ↓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

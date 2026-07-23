import FilterByDateRange from "@/app/(dashboard)/dashboard/reporting/components/filter/FilterByDateRange";
import { Search } from "lucide-react";

interface GiftCardSearchFiltersProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  startDate?: string;
  endDate?: string;
  activeModal: Record<string, boolean>;
  closeModal: (name: string) => void;
  toggleModal: (name: string) => void;
}

export function GiftCardSearchFilters({
  searchInput,
  onSearchChange,
  startDate,
  endDate,
  activeModal,
  closeModal,
  toggleModal,
}: GiftCardSearchFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 sm:max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search Purchaser, Recipient, Code or Order..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
        />
      </div>
      <FilterByDateRange
        startDate={startDate}
        endDate={endDate}
        modalName="dateRange"
        activeModal={activeModal}
        closeModal={closeModal}
        toggleModal={toggleModal}
        queryDateFormat="yyyy-MM-dd"
      />
    </div>
  );
}

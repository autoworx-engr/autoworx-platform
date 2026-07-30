"use client";

import { Search } from "lucide-react";
import { useCalendarSearch } from "../../_hook/useCalendarSearch";
import { CalendarSearchDropdown } from "./CalendarSearchDropdown";

export default function CalendarSearch({ type }: { type: string }) {
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    hasMore,
    loadMore,
    isDropdownOpen,
    setIsDropdownOpen,
    isTaskLoad,
    isAppointmentLoad,
    isTaskError,
    isAppointmentError,
    dropdownRef,
    inputRef,
    handleResultClick,
  } = useCalendarSearch(type);

  return (
    <div className="relative w-full">
      <div className="group relative flex w-full items-center gap-x-3 rounded-lg bg-white dark:bg-slate-900 px-4 py-2 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 focus-within:shadow-md focus-within:shadow-indigo-500/5 hover:ring-slate-300 dark:hover:ring-slate-600">
        <Search
          size={20}
          className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors duration-300 flex-shrink-0"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value.trimStart();
            setSearchTerm(value);
            setIsDropdownOpen(value !== "");
          }}
          onFocus={() => {
            if (searchTerm.trim() !== "") {
              setIsDropdownOpen(true);
            }
          }}
          placeholder="Search Tasks and Appointments..."
          className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {isDropdownOpen && (
        <CalendarSearchDropdown
          isTaskLoad={isTaskLoad}
          isAppointmentLoad={isAppointmentLoad}
          isTaskError={isTaskError}
          isAppointmentError={isAppointmentError}
          searchTerm={searchTerm}
          searchResults={searchResults}
          hasMore={hasMore}
          loadMore={loadMore}
          handleResultClick={handleResultClick}
          dropdownRef={dropdownRef}
        />
      )}
    </div>
  );
}

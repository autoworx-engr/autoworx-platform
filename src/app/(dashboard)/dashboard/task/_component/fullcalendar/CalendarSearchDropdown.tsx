"use client";

import { Calendar, Car, Clock, User } from "lucide-react";
import moment from "moment";
import { SearchResult } from "../../_hook/useCalendarSearch";

interface CalendarSearchDropdownProps {
  isTaskLoad: boolean;
  isAppointmentLoad: boolean;
  isTaskError: boolean;
  isAppointmentError: boolean;
  searchTerm: string;
  searchResults: SearchResult[];
  hasMore: boolean;
  loadMore: () => void;
  handleResultClick: (result: SearchResult) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function CalendarSearchDropdown({
  isTaskLoad,
  isAppointmentLoad,
  isTaskError,
  isAppointmentError,
  searchTerm,
  searchResults,
  hasMore,
  loadMore,
  handleResultClick,
  dropdownRef,
}: CalendarSearchDropdownProps) {
  if (isTaskError || isAppointmentError) {
    const message =
      isTaskError && isAppointmentError
        ? "Failed to load tasks and appointments"
        : isTaskError
          ? "Failed to load tasks"
          : "Failed to load appointments";
    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background p-4 shadow-md"
      >
        <p className="text-center text-muted-foreground text-red-400">
          {message}
        </p>
      </div>
    );
  }

  if (
    !isTaskLoad &&
    !isAppointmentLoad &&
    searchTerm.trim() !== "" &&
    searchResults.length === 0
  ) {
    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 mt-1 w-full lg:w-80 xl:w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-md"
      >
        <div className="px-4 py-8 text-center">
          <p className="text-center text-muted-foreground">No results found</p>
        </div>
      </div>
    );
  }

  if (searchTerm.trim() !== "" && (isTaskLoad || isAppointmentLoad)) {
    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 mt-2 w-full lg:w-80 xl:w-80 overflow-hidden rounded-xl ring-1 ring-slate-900/5 dark:ring-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xl"
      >
        <div className="px-4 py-8 flex items-center justify-center">
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="flex-1 w-fit text-sm text-slate-500 dark:text-slate-400 font-medium">
              Searching...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (searchResults.length > 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 mt-2 w-full lg:w-80 xl:w-80 overflow-hidden rounded-xl ring-1 ring-slate-900/5 dark:ring-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xl"
      >
        <div
          className="max-h-80 overflow-y-auto thin-scrollbar"
          onScroll={(e) => {
            if (!hasMore) return;
            const el = e.currentTarget;
            // Load the next window when scrolled near the bottom.
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
              loadMore();
            }
          }}
        >
          {searchResults.map((result, index) => (
            <div key={`${result.type}-${result.id}`}>
              <div
                onClick={() => handleResultClick(result)}
                className={`group relative cursor-pointer px-4 py-3 transition-all duration-300 ease-in-out hover:bg-slate-100/70 dark:hover:bg-slate-800/70 focus:bg-slate-100/70 focus:outline-none`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-600 dark:text-white text-base leading-snug flex-1 pr-16 line-clamp-2 break-words max-w-[250px] truncate">
                      {result.title}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border 
                                  bg-primary/10 text-primary dark:text-cyan-400 border-primary/50 flex-shrink-0 absolute top-3 right-4`}
                      style={{ color: "#6571FF", borderColor: "#6571FF" }}
                    >
                      {result.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-slate-600 dark:text-slate-400">
                    {(result.firstName || result.lastName) && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-sm font-medium">
                          {[result.firstName, result.lastName]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </div>
                    )}

                    {result.vehicle && (
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="text-sm">{result.vehicle}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-1 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <time className="text-xs font-medium">
                        {moment.utc(result.date).format("MMM DD, YYYY")}
                      </time>
                    </div>
                    {result.startTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <time className="text-xs font-medium">
                          {moment
                            .utc(result.startTime, "HH:mm")
                            .format("h:mm A")}
                        </time>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {index < searchResults.length - 1 && (
                <div className="mx-4 border-b border-slate-200/50 dark:border-slate-700/50" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

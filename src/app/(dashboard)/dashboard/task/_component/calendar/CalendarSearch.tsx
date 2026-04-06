"use client";

import { useCalendarStore } from "@/stores/calendarStore";
import { Calendar, Car, Clock, Search, User } from "lucide-react";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useAppointmentSearchQuery from "../../_hook/appointment/query/useAppointmentSearchQuery";
import useTaskSearchQuery from "../../_hook/task/query/useTaskSearchQuery";

type SearchResult = {
  id: number;
  title: string;
  date: Date | string;
  type: "task" | "appointment";
  startTime?: string;
  firstName?: string;
  lastName?: string;
  vehicle?: string;
};

export default function CalendarSearch({ type }: { type: string }) {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: tasks = [],
    isLoading: isTaskLoad,
    isError: isTaskError,
  } = useTaskSearchQuery(searchTerm);

  const {
    data: appointments = [],
    isLoading: isAppointmentLoad,
    isError: isAppointmentError,
  } = useAppointmentSearchQuery(searchTerm);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [allItems, setAllItems] = useState<SearchResult[]>([]);

  const { setDate, setStartTime, setNavigating } = useCalendarStore(); // Zustand store for managing date state
  const router = useRouter();

  useEffect(() => {
    if (tasks.length > 0 || appointments.length > 0) {
      setAllItems([
        ...tasks.map((task) => ({
          id: task.id,
          title: task.title,
          date: task?.date || "",
          type: "task" as const,
          startTime: task.startTime ?? "",
          firstName: task.client?.firstName || "",
          lastName: task.client?.lastName || "",
          vehicle: task?.Invoice?.vehicle
            ? `${task.Invoice.vehicle.year} ${task.Invoice.vehicle.make} ${task.Invoice.vehicle.model}`
            : "",
        })),
        ...appointments.map((appointment) => ({
          id: appointment.id,
          title: appointment.title || "Untitled Appointment",
          date: appointment?.date || "", // Fallback to current date if null
          type: "appointment" as const,
          startTime: appointment.startTime ?? "",
          firstName: appointment.client?.firstName || "",
          lastName: appointment.client?.lastName || "",
          vehicle: appointment.vehicle
            ? `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`
            : "",
        })),
      ]);
    }
  }, [tasks, appointments]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const trimmedSearchTerm = searchTerm.trim().toLowerCase();

    const filteredResults = allItems.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const firstName = (item.firstName || "").toLowerCase();
      const lastName = (item.lastName || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const vehicle = (item.vehicle || "").toLowerCase();

      const searchFields = [title, firstName, lastName, fullName, vehicle];

      return searchFields.some(
        (field) =>
          field.includes(trimmedSearchTerm) ||
          field.startsWith(trimmedSearchTerm) ||
          field.split(" ").some((word) => word.startsWith(trimmedSearchTerm)),
      );
    });

    filteredResults.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    setSearchResults(filteredResults.slice(0, 10)); // Limit to 10 results
  }, [searchTerm, allItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const handleResultClick = (result: SearchResult) => {
    const formattedDate = moment.utc(result.date).format("YYYY-MM-DD");

    // Update Zustand state with the selected date and startTime
    setDate(formattedDate);
    setStartTime(result.startTime || null);

    // If the current type is not "day", navigate to the "day" view
    if (type !== "day") {
      // Set navigation flag to prevent reset, then navigate
      setNavigating(true);
      router.push(`/dashboard/task/day`);

      // Clear navigation flag after a short delay to allow navigation to complete
      // setTimeout(() => setNavigating(false), 30000);
    }

    // Clear search and close dropdown
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  let errorContent = null;

  if (isTaskError && isAppointmentError) {
    errorContent = (
      <div
        ref={dropdownRef}
        className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background p-4 shadow-md"
      >
        <p className="text-center text-muted-foreground text-red-400">
          Failed to load appointment or tasks
        </p>
      </div>
    );
  } else if (
    isDropdownOpen &&
    !isTaskLoad &&
    !isAppointmentLoad &&
    searchTerm.trim() !== "" &&
    searchResults.length === 0
  ) {
    errorContent = (
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
  return (
    <div className="relative w-full">
      <div className="group relative flex w-full items-center gap-x-3 rounded-lg bg-white dark:bg-slate-900 px-4 py-2 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 focus-within:shadow-md focus-within:shadow-indigo-500/5 hover:ring-slate-300 dark:hover:ring-slate-600">
        <Search
          size={20}
          className="h-5 w-5 text-slate-400 group-focus-within:text-[#6571FF] transition-colors duration-300 flex-shrink-0"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsDropdownOpen(e.target.value.trim() !== "");
          }}
          onFocus={() => {
            if (searchTerm.trim() !== "") {
              setIsDropdownOpen(true);
            }
          }}
          placeholder="Search tasks and appointments..."
          className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {isDropdownOpen &&
        searchTerm.trim() !== "" &&
        (isTaskLoad || isAppointmentLoad) && (
          <div
            ref={dropdownRef}
            // Applying premium glassmorphism container style
            className="absolute z-50 mt-2 w-full lg:w-80 xl:w-80 overflow-hidden rounded-xl ring-1 ring-slate-900/5 dark:ring-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xl"
          >
            <div className="px-4 py-8 flex items-center justify-center">
              <div className="flex items-center justify-center gap-2">
                {/* Spinner uses the ACTION_COLOR */}
                <div className="flex-1 h-4 w-4 animate-spin rounded-full border-2 border-[#6571FF] border-t-transparent"></div>
                <span className="flex-1 w-fit text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Searching...
                </span>
              </div>
            </div>
          </div>
        )}

      {isDropdownOpen &&
        !isTaskLoad &&
        !isAppointmentLoad &&
        searchResults.length > 0 && (
          <div
            ref={dropdownRef}
            // Applying premium glassmorphism container style
            className="absolute z-50 mt-2 w-full lg:w-80 xl:w-80 overflow-hidden rounded-xl ring-1 ring-slate-900/5 dark:ring-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xl"
          >
            <div className="max-h-80 overflow-y-auto thin-scrollbar">
              {searchResults.map((result, index) => (
                <div key={`${result.type}-${result.id}`}>
                  <div
                    onClick={() => handleResultClick(result)}
                    // Hover effect is refined: slightly darker background, smooth transition
                    className={`group relative cursor-pointer px-4 py-3 transition-all duration-300 ease-in-out hover:bg-slate-100/70 dark:hover:bg-slate-800/70 focus:bg-slate-100/70 focus:outline-none`}
                  >
                    <div className="space-y-2">
                      {/* Header with title and type badge */}
                      <div className="flex items-start justify-between gap-3">
                        {/* Title: Enhanced typography */}
                        <h3 className="font-bold text-slate-600 dark:text-white text-base leading-snug flex-1 pr-16 line-clamp-2 break-words max-w-[250px] truncate">
                          {result.title}
                        </h3>

                        {/* Type Badge: Primary color used for the badge for prominence */}
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border 
                                  bg-[#6571FF]/10 text-[#6571FF] dark:text-cyan-400 border-[#6571FF]/50 flex-shrink-0 absolute top-3 right-4`}
                          style={{ color: "#6571FF", borderColor: "#6571FF" }} // Ensure dynamic color for badge text
                        >
                          {result.type}
                        </span>
                      </div>

                      {/* Client and Vehicle info with icons */}
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

                      {/* Date and Time with icons */}
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
                              {moment(result.startTime, "HH:mm").format(
                                "h:mm A",
                              )}
                            </time>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < searchResults.length - 1 && (
                    // Clean divider line
                    <div className="mx-4 border-b border-slate-200/50 dark:border-slate-700/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {errorContent}
    </div>
  );
}

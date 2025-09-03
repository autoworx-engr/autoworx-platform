"use client";

import { useCalendarStore } from "@/stores/calendarStore";
import { Calendar, Car, Clock, User } from "lucide-react";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BiSearch } from "react-icons/bi";
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
      const title = item.title.toLowerCase();

      return (
        title.includes(trimmedSearchTerm) ||
        title.startsWith(trimmedSearchTerm) ||
        title.split(" ").some((word) => word.startsWith(trimmedSearchTerm))
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
      <div className="relative">
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
          className="w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm"
        />
        <BiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {isDropdownOpen &&
        searchTerm.trim() !== "" &&
        (isTaskLoad || isAppointmentLoad) && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-2 w-full lg:w-80 xl:w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-md"
          >
            <div className="px-4 py-8 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="text-sm text-muted-foreground">
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
            className="absolute z-50 mt-2 w-full lg:w-80 xl:w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-md"
          >
            <div className="max-h-80 overflow-auto">
              {searchResults.map((result, index) => (
                <div key={`${result.type}-${result.id}`}>
                  <div
                    onClick={() => handleResultClick(result)}
                    className="group relative cursor-pointer px-4 py-4 transition-colors duration-150 hover:bg-accent/10 focus:bg-accent/10 focus:outline-none"
                  >
                    <div className="space-y-3">
                      {/* Header with title and type badge */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-foreground text-base leading-tight text-balance flex-1 pr-20 line-clamp-2 break-words">
                          {result.title}
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 capitalize flex-shrink-0 absolute top-4 right-4">
                          {result.type}
                        </span>
                      </div>

                      {/* Client and Vehicle info with icons */}
                      <div className="grid grid-cols-1 gap-2">
                        {(result.firstName || result.lastName) && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground">
                              {[result.firstName, result.lastName]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                          </div>
                        )}

                        {result.vehicle && (
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-foreground">
                              {result.vehicle}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Date and Time with icons */}
                      <div className="flex items-center gap-4 pt-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <time className="text-sm font-medium text-foreground">
                            {moment.utc(result.date).format("MMM DD, YYYY")}
                          </time>
                        </div>
                        {result.startTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <time className="text-sm font-medium text-foreground">
                              {moment(result.startTime, "HH:mm").format(
                                "h:mm A"
                              )}
                            </time>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < searchResults.length - 1 && (
                    <div className="mx-4 border-b border-border/50" />
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

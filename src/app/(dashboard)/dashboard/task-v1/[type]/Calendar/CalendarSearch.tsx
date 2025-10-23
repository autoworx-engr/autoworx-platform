"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarAppointment, CalendarTask } from "@/types/db";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useCalendarStore } from "@/stores/calendarStore";
import { Search } from "lucide-react";

type SearchResult = {
  id: number;
  title: string;
  date: Date | string;
  type: "task" | "appointment";
  startTime?: string;
};

export default function CalendarSearch({
  type,
  tasks,
  appointments,
}: {
  type: string;
  tasks: CalendarTask[];
  appointments: CalendarAppointment[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setDate, setStartTime, setNavigating } = useCalendarStore(); // Zustand store for managing date state
  const router = useRouter();

  const allItems = useRef<SearchResult[]>([]);

  useEffect(() => {
    allItems.current = [
      ...tasks.map((task) => ({
        id: task.id,
        title: task.title,
        date: task.date,
        type: "task" as const,
        startTime: task.startTime,
      })),
      ...appointments.map((appointment) => ({
        id: appointment.id,
        title: appointment.title || "Untitled Appointment",
        date: appointment.date || new Date(), // Fallback to current date if null
        type: "appointment" as const,
        startTime: appointment.startTime || undefined, // Convert null to undefined
      })),
    ];
  }, [tasks, appointments]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const filteredResults = allItems.current.filter((item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredResults.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    setSearchResults(filteredResults.slice(0, 10)); // Limit to 10 results
  }, [searchTerm]);

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
    const formattedDate = moment(result.date).format("YYYY-MM-DD");

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
        <Search
          size={18}
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>

      {isDropdownOpen && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-input bg-background shadow-md"
        >
          {searchResults.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className="flex cursor-pointer flex-col px-4 py-2 hover:bg-muted"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{result.title}</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {result.type}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {moment(result.date).format("MMM DD, YYYY")}
                {result.startTime &&
                  ` · ${moment(result.startTime, "HH:mm").format("h:mm A")}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {isDropdownOpen &&
        searchTerm.trim() !== "" &&
        searchResults.length === 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background p-4 shadow-md"
          >
            <p className="text-center text-muted-foreground">
              No results found
            </p>
          </div>
        )}
    </div>
  );
}

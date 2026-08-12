"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { useCalendarStore } from "@/stores/calendarStore";
import useTaskSearchQuery from "./task/query/useTaskSearchQuery";
import useAppointmentSearchQuery from "./appointment/query/useAppointmentSearchQuery";
import { searchWords } from "../_utils/clientNameSearch";

export type SearchResult = {
  id: number;
  title: string;
  date: Date | string;
  createdAt: Date | string;
  type: "task" | "appointment";
  startTime?: string;
  firstName?: string;
  lastName?: string;
  vehicle?: string;
};

export function useCalendarSearch(type: string) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setDate, setStartTime, setNavigating } = useCalendarStore();
  const router = useRouter();

  const {
    data: taskData,
    isLoading: isTaskLoad,
    isError: isTaskError,
    hasNextPage: taskHasNext,
    isFetchingNextPage: taskFetchingNext,
    fetchNextPage: fetchNextTasks,
  } = useTaskSearchQuery(searchTerm);

  const {
    data: appointmentData,
    isLoading: isAppointmentLoad,
    isError: isAppointmentError,
    hasNextPage: apptHasNext,
    isFetchingNextPage: apptFetchingNext,
    fetchNextPage: fetchNextAppointments,
  } = useAppointmentSearchQuery(searchTerm);

  // Flatten the server-paginated pages loaded so far.
  const tasks = useMemo(
    () => taskData?.pages.flatMap((p) => p.items) ?? [],
    [taskData],
  );
  const appointments = useMemo(
    () => appointmentData?.pages.flatMap((p) => p.items) ?? [],
    [appointmentData],
  );

  const searchResults = useMemo<SearchResult[]>(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) return [];

    const allItems: SearchResult[] = [
      ...tasks.map((task) => ({
        id: task.id,
        title: task.title,
        date: task?.date || "",
        createdAt: task?.createdAt || "",
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
        date: appointment?.date || "",
        createdAt: appointment?.createdAt || "",
        type: "appointment" as const,
        startTime: appointment.startTime ?? "",
        firstName: appointment.client?.firstName || "",
        lastName: appointment.client?.lastName || "",
        vehicle: appointment.vehicle
          ? `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`
          : "",
      })),
    ];

    const words = searchWords(trimmed);

    return allItems
      .filter((item) => {
        const title = (item.title || "").toLowerCase();
        const firstName = (item.firstName || "").toLowerCase();
        const lastName = (item.lastName || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const vehicle = (item.vehicle || "").toLowerCase();
        const fields = [title, firstName, lastName, fullName, vehicle];

        return words.every((word) =>
          fields.some(
            (field) =>
              field.includes(word) ||
              field.split(" ").some((part) => part.startsWith(word)),
          ),
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [searchTerm, tasks, appointments]);

  // Infinite scroll is server-side: pull the next page from whichever list
  // still has one. Results re-merge/sort as pages arrive.
  const hasMore = !!taskHasNext || !!apptHasNext;
  const isFetchingMore = taskFetchingNext || apptFetchingNext;
  const loadMore = useCallback(() => {
    if (isFetchingMore) return;
    if (taskHasNext) fetchNextTasks();
    if (apptHasNext) fetchNextAppointments();
  }, [
    isFetchingMore,
    taskHasNext,
    apptHasNext,
    fetchNextTasks,
    fetchNextAppointments,
  ]);

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
    setDate(formattedDate);
    setStartTime(result.startTime || null);

    if (type !== "day") {
      setNavigating(true);
      router.push(`/dashboard/task/day`);
    }

    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  return {
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
  };
}

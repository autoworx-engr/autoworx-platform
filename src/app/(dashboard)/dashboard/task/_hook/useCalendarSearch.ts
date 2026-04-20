"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { useCalendarStore } from "@/stores/calendarStore";
import useTaskSearchQuery from "./task/query/useTaskSearchQuery";
import useAppointmentSearchQuery from "./appointment/query/useAppointmentSearchQuery";

export type SearchResult = {
  id: number;
  title: string;
  date: Date | string;
  type: "task" | "appointment";
  startTime?: string;
  firstName?: string;
  lastName?: string;
  vehicle?: string;
};

export function useCalendarSearch(type: string) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allItems, setAllItems] = useState<SearchResult[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setDate, setStartTime, setNavigating } = useCalendarStore();
  const router = useRouter();

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
          date: appointment?.date || "",
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

    setSearchResults(filteredResults.slice(0, 10));
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

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const searchResults = useMemo<SearchResult[]>(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) return [];

    const allItems: SearchResult[] = [
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
    ];

    return allItems
      .filter((item) => {
        const title = (item.title || "").toLowerCase();
        const firstName = (item.firstName || "").toLowerCase();
        const lastName = (item.lastName || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const vehicle = (item.vehicle || "").toLowerCase();
        return [title, firstName, lastName, fullName, vehicle].some(
          (field) =>
            field.includes(trimmed) ||
            field.split(" ").some((word) => word.startsWith(trimmed)),
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [searchTerm, tasks, appointments]);

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

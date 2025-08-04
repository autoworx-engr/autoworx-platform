"use client";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar.ts";
import Users from "./Users";
import Tasks from "./Tasks";

export default function Body() {
  const { type } = useCalendarSidebarStore();

  if (type === "USERS") return <Users />;
  if (type === "TASKS") return <Tasks />;
}

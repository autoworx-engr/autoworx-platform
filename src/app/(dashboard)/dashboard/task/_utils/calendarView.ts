import { CalendarType } from "@/types/calendar";

export function getCalendarType(viewType: string): CalendarType {
  const lower = viewType.toLowerCase();
  if (lower.includes("list")) return "list";
  if (lower.includes("month")) return "month";
  if (lower.includes("week")) return "week";
  if (lower.includes("day")) return "day";
  return "week";
}

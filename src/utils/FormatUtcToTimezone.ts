// "use client";
// import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import moment from "moment-timezone";

export const FormatUtcToTimezone = (
  date: string | Date | null,
  timezone: string,
  format = "YYYY-MM-DD",
): string => {
  // const timezone = useCompanyTimezone();
  if (!date) return "N/A";
  return moment
    .utc(date)
    .tz(timezone || "UTC")
    .format(format);
};

"use client";

import moment from "moment-timezone";
import { useCalendarStore } from "@/stores/calendarStore";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

export function useDate() {
  const { date } = useCalendarStore();
  const timezone = useCompanyTimezone();
  
  if (!date) {
    return moment.tz(timezone);
  }
  
  const parsedDate = moment.tz(date, moment.HTML5_FMT.DATE, timezone);
  return parsedDate.isValid() ? parsedDate : moment.tz(timezone);
}
"use client";

import moment from "moment";
import { useCalendarStore } from "@/stores/calendarStore";

export function useDate() {
  const { date } = useCalendarStore();
  const parsedDate = moment(date, moment.HTML5_FMT.DATE);
  return parsedDate.isValid() ? parsedDate : moment();
}
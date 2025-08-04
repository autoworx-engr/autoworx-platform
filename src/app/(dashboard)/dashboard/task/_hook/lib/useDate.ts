import { useCalendarStore } from "@/stores/calendarStore";
import moment from "moment";

export function useDate() {
  const { date } = useCalendarStore();
  const parsedDate = moment(date, moment.HTML5_FMT.DATE);
  return parsedDate.isValid() ? parsedDate : moment();
}

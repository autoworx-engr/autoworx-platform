import { useCalendarStore } from "@/stores/calendarStore";
import moment from "moment";

export default function useMonth() {
  const { month } = useCalendarStore();

  const parsedMonth = moment(month, moment.HTML5_FMT.MONTH, true);
  return parsedMonth.isValid() ? parsedMonth : moment();
}

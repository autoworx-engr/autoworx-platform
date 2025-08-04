import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import moment from "moment";

export default function DisplayDate({ type }: { type: CalendarType }) {
  const { date, week, month } = useCalendarStore();

  const param = type === "day" ? date : type === "week" ? week : month;
  const formattedDate = moment(param).isValid()
    ? moment(param).format(type === "day" ? "dddd, D MMMM YYYY" : "MMMM YYYY")
    : moment().format(type === "day" ? "dddd, D MMMM YYYY" : "MMMM YYYY");

  return <>{formattedDate}</>;
}

import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import moment from "moment";

export default function DisplayDate({ type }: { type: CalendarType }) {
  const { date } = useCalendarStore();

  const param = date;

  const longFormat =
    type === "day" || type === "list" ? "dddd, MMMM D, YYYY" : "MMMM YYYY";
  const shortFormat =
    type === "day" || type === "list" ? "ddd, MMM D, YY" : "MMM YY";

  const formattedDateLong = moment(param).isValid()
    ? moment(param).format(longFormat)
    : moment().format(longFormat);

  const formattedDateShort = moment(param).isValid()
    ? moment(param).format(shortFormat)
    : moment().format(shortFormat);

  return (
    <>
      {/* Small screen → short format */}
      <span className="block md:hidden">{formattedDateShort}</span>

      {/* Medium & Large screen → long format */}
      <span className="hidden md:block">{formattedDateLong}</span>
    </>
  );
}

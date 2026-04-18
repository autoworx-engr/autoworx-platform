import { CalendarType } from "@/types/calendar";
// import Calendar from "../_component/calendar/Calendar";
import Calendar from "../_component/fullcalendar/fullcalendar";

export default function CalenderPage({
  params,
}: {
  params: { type: CalendarType };
}) {
  // return <Calendar type={params.type} />;
  return <Calendar type={params.type} />;
}

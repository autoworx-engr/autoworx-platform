import { CalendarType } from "@/types/calendar";
// import Calendar from "../_component/calendar/Calendar";
import Calendar from "../_component/fullcalendar/fullcalendar";

export default async function CalenderPage(props: {
  params: Promise<{ type: CalendarType }>;
}) {
  const params = await props.params;
  // return <Calendar type={params.type} />;
  return <Calendar type={params.type} />;
}

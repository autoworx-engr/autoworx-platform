import { CalendarType } from "@/types/calendar";
import Calendar from "../_component/fullcalendar/fullcalendar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task & Activity Management",
  description: "Task & Activity Management",
};

export default async function CalenderPage(props: {
  params: Promise<{ type: CalendarType }>;
}) {
  const params = await props.params;
  return <Calendar type={params.type} />;
}

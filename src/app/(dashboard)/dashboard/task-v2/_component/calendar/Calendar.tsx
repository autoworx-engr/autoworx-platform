import { CalendarType } from "@/types/calendar";
import Body from "./Body";
import Heading from "./Heading";
import AppointmentLists from "./AppointmentLists";
import Tasks from "../../../task/_component/sideBar/Tasks";

type TCalendarProps = {
  type: CalendarType;
};

export default async function Calendar({ type }: TCalendarProps) {
  return (
    <div className="md:app-shadow relative h-auto w-full p-2 md:rounded-[18px] md:bg-background">
      <Heading type={type} />
      <Body type={type} />
      <div className="block md:hidden">
        <AppointmentLists />
      </div>
      <div className="block md:hidden">
        <Tasks />
      </div>
    </div>
  );
}

import { useCalendarStore } from "@/stores/calendarStore";
import FullCalendar from "@fullcalendar/react";
import moment from "moment";
import { RefObject, useEffect, useRef } from "react";

export function useCalendarStoreSync(
  calendarRef: RefObject<FullCalendar | null>,
) {
  const { date, setDate, setWeek, setMonth } = useCalendarStore();
  const isNavigatingFromCalendar = useRef(false);

  useEffect(() => {
    if (!calendarRef.current || !date) return;
    const calApi = calendarRef.current.getApi();
    if (moment(calApi.getDate()).format("YYYY-MM-DD") !== date) {
      isNavigatingFromCalendar.current = true;
      setTimeout(() => calApi.gotoDate(date), 0);
    }
  }, [date, calendarRef]);

  const handleDatesSet = (arg: any) => {
    if (isNavigatingFromCalendar.current) {
      isNavigatingFromCalendar.current = false;
      return;
    }

    const viewStart = moment(arg.view.currentStart);

    if (arg.view.type === "dayGridMonth") {
      const monthStart = viewStart.clone().startOf("month");
      setDate(monthStart.format("YYYY-MM-DD"));
      setMonth(monthStart.format("YYYY-MM"));
    } else {
      setDate(viewStart.format("YYYY-MM-DD"));
      if (arg.view.type === "timeGridWeek") {
        setWeek(viewStart.format("YYYY-[W]WW"));
      }
    }
  };

  return { handleDatesSet };
}

import { useCalendarStore } from "@/stores/calendarStore";
import FullCalendar from "@fullcalendar/react";
import moment from "moment";
import { RefObject, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeCalendarDateParam } from "../../_utils/calendarDateParam";

export function useCalendarStoreSync(
  calendarRef: RefObject<FullCalendar | null>,
) {
  const { date, setDate, setWeek, setMonth, setStartTime } = useCalendarStore();
  const isNavigatingFromCalendar = useRef(false);
  const searchParams = useSearchParams();
  const requestedDate = searchParams.get("date");
  const requestedTime = searchParams.get("time");
  const appliedTimeRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedDate = normalizeCalendarDateParam(requestedDate);
    if (normalizedDate && normalizedDate !== date) {
      setDate(normalizedDate);
    }
  }, [date, requestedDate, setDate]);

  // A `&time=` param (notification links) scrolls the day view to that hour, the
  // same way clicking a task in the sidebar does. Applied once per value —
  // `setStartTime(null)` after scrolling would otherwise re-trigger it forever.
  useEffect(() => {
    if (!requestedTime) return;
    if (appliedTimeRef.current === requestedTime) return;
    if (!/^\d{2}:\d{2}$/.test(requestedTime)) return;

    appliedTimeRef.current = requestedTime;
    setStartTime(requestedTime);
  }, [requestedTime, setStartTime]);

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

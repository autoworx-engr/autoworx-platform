import { useCalendarStore } from "@/stores/calendarStore";
import FullCalendar from "@fullcalendar/react";
import moment from "moment";
import { RefObject, useEffect, useRef } from "react";

/**
 * Keeps the calendarStore (date / week / month) in sync with FullCalendar's
 * internal navigation (navLinks clicks, prev/next, view switches).
 *
 * Returns `handleDatesSet` to pass to FullCalendar's `datesSet` prop.
 * The store → gotoDate → datesSet feedback loop is broken via the
 * `isNavigatingFromCalendar` ref.
 */
export function useCalendarStoreSync(
  calendarRef: RefObject<FullCalendar | null>,
) {
  const { date, setDate, setWeek, setMonth } = useCalendarStore();
  const isNavigatingFromCalendar = useRef(false);

  // When the store date changes externally (DateSelector, Today button, etc.)
  // navigate FullCalendar to that date — but skip when we set it ourselves.
  useEffect(() => {
    if (!calendarRef.current || !date) return;
    if (isNavigatingFromCalendar.current) {
      isNavigatingFromCalendar.current = false;
      return;
    }
    const calApi = calendarRef.current.getApi();
    if (moment(calApi.getDate()).format("YYYY-MM-DD") !== date) {
      calApi.gotoDate(date);
    }
  }, [date, calendarRef]);

  // Called by FullCalendar on every navigation — syncs the store so that
  // DisplayDate (and anything else reading the store) stays accurate.
  const handleDatesSet = (arg: any) => {
    isNavigatingFromCalendar.current = true;
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

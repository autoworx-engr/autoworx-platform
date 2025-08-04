import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarSettings } from "@prisma/client";
import { getWeekStartNumber } from "../../_utils/utils.DateSelector";
import moment from "moment";

export default function useWeek(settings?: CalendarSettings | null) {
  const { week } = useCalendarStore();
  const weekStart = settings?.weekStart || "Sunday"; // Use weekStart from settings
  const weekStartNumber = getWeekStartNumber(weekStart);

  moment.updateLocale("en", {
    week: {
      dow: weekStartNumber, // Set the start of the week
    },
  });

  const parsedWeek = moment(week, "YYYY-[W]WW");
  return parsedWeek.isValid() ? parsedWeek : moment();
}

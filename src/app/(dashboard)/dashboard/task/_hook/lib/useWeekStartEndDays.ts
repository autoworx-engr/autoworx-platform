import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { useMemo } from "react";
import { getWeekInfoFromWeekStr } from "../../_utils/utils.DateSelector";
import useWeek from "./useWeek";
import { calenderQueryKey } from "../../_constant";

export default function useWeekStartEndDays() {
  const { data: settings } = useQuery({
    queryKey: [calenderQueryKey.weekStartEndDaysSettings],
    queryFn: async () => {
      const res = await fetch("/api/calendar-settings");
      const data = await res.json();
      return data;
    },
  });
  const week = useWeek(settings);
  const weekStart = settings?.weekStart || "Sunday";
  const days = useMemo(() => {
    const weekInfo = getWeekInfoFromWeekStr(
      week.format("YYYY-[W]WW"),
      weekStart,
    );
    const startOfWeek = moment(weekInfo.startDate);

    const daysInWeek = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = moment(startOfWeek).add(i, "days");
      daysInWeek.push({
        dayName: currentDay.format("dddd"),
        date: currentDay.format("YYYY-MM-DD"),
      });
    }

    return daysInWeek;
  }, [week, weekStart]);
  const weekStartDate = days[0].date;
  const weekEndDate = days[days.length - 1].date;
  return { days, weekStartDate, weekEndDate };
}

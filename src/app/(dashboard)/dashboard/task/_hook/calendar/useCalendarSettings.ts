import { getWeekStartNumber } from "@/app/(dashboard)/dashboard/task/_utils/utils.DateSelector";
import { getCalenderSettings } from "@/actions/task/getCalendarSettings";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import styles from "../../_component/fullcalendar/fullcalendar.module.css";

export function useCalendarSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["calendarSettings"],
    queryFn: () => getCalenderSettings(),
  });

  const firstDay = useMemo(() => {
    const mapped = getWeekStartNumber(settings?.weekStart ?? "Monday");
    return mapped >= 0 ? mapped : 0;
  }, [settings?.weekStart]);

  const businessHours = useMemo(() => {
    if (!settings?.dayStart || !settings?.dayEnd) return undefined;
    return {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: settings.dayStart,
      endTime: settings.dayEnd,
    };
  }, [settings]);

  const businessMinutes = useMemo(() => {
    if (!settings?.dayStart || !settings?.dayEnd) return null;
    const parse = (t: string) => {
      const [h = 0, m = 0] = t.split(":").map(Number);
      return h * 60 + m;
    };
    return { start: parse(settings.dayStart), end: parse(settings.dayEnd) };
  }, [settings]);

  const nonBusinessSlotClassNames = useCallback(
    (arg: { date?: Date }) => {
      if (!arg.date || !businessMinutes) return [];
      const mins = arg.date.getHours() * 60 + arg.date.getMinutes();
      const isNonBusiness =
        mins < businessMinutes.start || mins >= businessMinutes.end;
      return isNonBusiness ? [styles.nonBusinessSlot] : [];
    },
    [businessMinutes],
  );

  return {
    settings,
    isLoading,
    firstDay,
    businessHours,
    nonBusinessSlotClassNames,
  };
}

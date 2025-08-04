import { useQuery } from "@tanstack/react-query";
import { calenderQueryKey } from "../../../_constant";
import { getCalenderSettings } from "@/actions/task/getCalendarSettings";

export default function useSettingsQuery() {
  return useQuery({
    queryKey: [calenderQueryKey.calendarSettings],
    queryFn: () => {
      return getCalenderSettings();
    },
  });
}

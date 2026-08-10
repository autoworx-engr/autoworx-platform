import { useQuery } from "@tanstack/react-query";
import { calenderQueryKey } from "../../../_constant";

export default function useSettingsQuery() {
  return useQuery({
    queryKey: [calenderQueryKey.calendarSettings],
    queryFn: async () => {
      const response = await fetch("/api/calendar-settings");
      const data = await response.json();
      return data?.data ?? data;
    },
  });
}

import getHoliday from "@/actions/task/getHoliday";
import { useQuery } from "@tanstack/react-query";
import { calenderQueryKey } from "../../../_constant";

export default function useGetHolidays(companyId: number) {
  return useQuery({
    queryKey: [calenderQueryKey.holidays],
    queryFn: async () => {
      if (!companyId) return [];
      const holidays = await getHoliday(companyId);
      return holidays;
    },
  });
}

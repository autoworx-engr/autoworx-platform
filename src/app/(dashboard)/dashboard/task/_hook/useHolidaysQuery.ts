import { useSession } from "next-auth/react";
import { calenderQueryKey } from "../_constant";
import { useQuery } from "@tanstack/react-query";
import getHoliday from "@/actions/task/getHoliday";

export default function useHolidaysQuery(month: string, year: number) {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;
  return useQuery({
    queryKey: [calenderQueryKey.holidays, month, year],
    queryFn: async () => {
      if (!month || !year || !companyId) return;
      const holidays = await getHoliday(companyId, month, year);
      return holidays;
    },
  });
}

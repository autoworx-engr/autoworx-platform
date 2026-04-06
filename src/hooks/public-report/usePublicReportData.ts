import { useQuery } from "@tanstack/react-query";
import { getPublicReportData } from "@/service/public-report/api";

export const usePublicReportData = (
  companyId: number,
  startDate: string,
  endDate: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["public-report", companyId, startDate, endDate],
    queryFn: () => getPublicReportData(companyId, startDate, endDate),
    enabled: !!companyId && !!startDate && !!endDate && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

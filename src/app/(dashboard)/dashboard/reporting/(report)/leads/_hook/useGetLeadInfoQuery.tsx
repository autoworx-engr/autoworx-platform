import { useQuery } from "@tanstack/react-query";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { getLeadInfo } from "@/actions/dashboard/data/getLeadInfo";

type TParams = {
  startDate?: string;
  endDate?: string;
};

export const LEAD_INFO_QUERY_KEY = "leadInfo";

export default function useGetLeadInfoQuery({ startDate, endDate }: TParams) {
  const timezone = useCompanyTimezone();
  return useQuery({
    queryKey: [LEAD_INFO_QUERY_KEY, startDate, endDate],
    queryFn: () => getLeadInfo(timezone, startDate, endDate),
    refetchOnWindowFocus: true,
  });
}

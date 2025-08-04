import getCompanyAllBugReport from "@/actions/bug-report/getCompanyAllBugReport";
import { useQuery } from "@tanstack/react-query";

export const useGetAllCompanyBugReports = () => {
  return useQuery({
    queryKey: ["bug-reports-company"],
    queryFn: async () => await getCompanyAllBugReport(),
  });
};

import getCompanyBugReportMessage from "@/actions/bug-report-message/getCompanyBugReportMessage";
import { useQuery } from "@tanstack/react-query";

export const useGetAllBugReportsMessages = (id: number) => {
  return useQuery({
    queryKey: ["bug-reports-messages", id],
    queryFn: async () => await getCompanyBugReportMessage({ bugReportId: id }),
    enabled: !!id,
  });
};

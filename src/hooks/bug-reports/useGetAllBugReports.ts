import getAllBugReport from "@/actions/bug-report/getAllBugReport";
import { useQuery } from "@tanstack/react-query";

export const useGetAllBugReports = (take?: number) => {
  return useQuery({
    queryKey: ["bug-reports"],
    queryFn: async () => await getAllBugReport({ take: take }),
  });
};

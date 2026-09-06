import getTasks from "@/actions/task/getTasks";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { getUpcomingTaskDateFilter } from "@/utils/upcomingTaskFilter";
import { useQuery } from "@tanstack/react-query";

const defaultTake = 20;
export default function useTasksQueryForDashboard(options?: {
  enabled?: boolean;
}) {
  const timezone = useCompanyTimezone();

  return useQuery({
    queryKey: [...queryKeys.dashboardTask, timezone],
    queryFn: async () => {
      const response = await getTasks({
        where: getUpcomingTaskDateFilter(timezone),
        orderBy: {
          createdAt: "desc",
        },
        take: defaultTake,
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
}

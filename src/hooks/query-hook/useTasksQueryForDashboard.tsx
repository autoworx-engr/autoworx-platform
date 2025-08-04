import getTasks from "@/actions/task/getTasks";
import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";

const defaultTake = 20;
export default function useTasksQueryForDashboard(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.dashboardTask,
    queryFn: async () => {
      const response = await getTasks({
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

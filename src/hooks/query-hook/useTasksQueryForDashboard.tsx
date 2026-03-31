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
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(todayStart.getDate() + 1);

      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;

      const response = await getTasks({
        where: {
          OR: [
            // Any task after today should be shown.
            { date: { gte: tomorrowStart } },
            // Today's tasks should only show if they are upcoming or all-day.
            {
              AND: [
                { date: { gte: todayStart } },
                { date: { lt: tomorrowStart } },
                {
                  OR: [
                    { startTime: null },
                    { startTime: "" },
                    { startTime: { gte: currentTime } },
                  ],
                },
              ],
            },
          ],
        },
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

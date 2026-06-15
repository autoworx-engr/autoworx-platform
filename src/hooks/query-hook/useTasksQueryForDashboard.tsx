import getTasks from "@/actions/task/getTasks";
import { queryKeys } from "@/lib/queryKeys";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useQuery } from "@tanstack/react-query";
import moment from "moment-timezone";

const defaultTake = 20;
export default function useTasksQueryForDashboard(options?: {
  enabled?: boolean;
}) {
  const timezone = useCompanyTimezone();

  return useQuery({
    queryKey: [...queryKeys.dashboardTask, timezone],
    queryFn: async () => {
      const nowTz = moment.tz(timezone);
      const todayLocalDate = nowTz.format("YYYY-MM-DD");

      const todayStart = moment.utc(todayLocalDate).toDate();
      const tomorrowStart = moment.utc(todayLocalDate).add(1, "day").toDate();

      const currentTime = nowTz.format("HH:mm");

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

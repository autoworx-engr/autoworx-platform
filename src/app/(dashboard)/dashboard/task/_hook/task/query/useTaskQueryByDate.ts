import { useQuery } from "@tanstack/react-query";
import { taskQueryKey } from "../../../_constant";
import getTasks from "@/actions/task/getTasks";

export default function useTaskQueryByDate(date: string) {
  return useQuery({
    queryKey: [taskQueryKey.allTasks, date],
    queryFn: async () => {
      const response = await getTasks({
        where: {
          date: `${date}T00:00:00.000Z`,
          AND: [{ startTime: { not: null } }, { endTime: { not: null } }],
        },
      });
      return response.data;
    },
  });
}

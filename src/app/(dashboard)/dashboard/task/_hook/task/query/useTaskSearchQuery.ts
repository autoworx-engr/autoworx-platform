import getTasks from "@/actions/task/getTasks";
import { useQuery } from "@tanstack/react-query";
import { taskQueryKey } from "../../../_constant";

export default function useTaskSearchQuery(searchTerm: string) {
  return useQuery({
    queryKey: [taskQueryKey.allTasks, searchTerm],
    queryFn: async () => {
      const response = await getTasks({
        where: {
          OR: [
            {
              title: { contains: searchTerm },
            },
          ],
        },
      });
      return response.data;
    },
    enabled: !!searchTerm.trim(),
  });
}

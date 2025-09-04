import getTasks from "@/actions/task/getTasks";
import { useQuery } from "@tanstack/react-query";
import { taskQueryKey } from "../../../_constant";
import { Task } from "@prisma/client";

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
        include: {
          client:{
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          Invoice: {
            select: {
              vehicle: true
            }
          }
        }
        
      });
      return response.data as (Task & {
  client: { id: number; firstName: string; lastName: string } | null;
  Invoice: { vehicle: { id: number; make: string; model: string; year: string } | null } | null;
})[];
    },
    enabled: !!searchTerm.trim(),
  });
}

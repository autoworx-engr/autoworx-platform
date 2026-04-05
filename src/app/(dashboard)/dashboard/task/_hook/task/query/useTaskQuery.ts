import { useQuery } from "@tanstack/react-query";
import { taskQueryKey } from "../../../_constant";
import getTasks from "@/actions/task/getTasks";

export default function useTaskQuery(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [taskQueryKey.allTasks, startDate, endDate],
    queryFn: async () => {
      const response = await getTasks({
        where: {
          date: {
            gte: `${startDate}T00:00:00.000Z`,
            lte: `${endDate}T23:59:59.999Z`,
          },
          OR: [
            { AND: [{ startTime: { not: null } }, { endTime: { not: null } }] },
            { AND: [{ startTime: null }, { endTime: null }] },
          ],
        },
        include: {
          taskUser: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeType: true,
                },
              },
            },
          },
        },
      });
      return response.data;
    },
  });
}

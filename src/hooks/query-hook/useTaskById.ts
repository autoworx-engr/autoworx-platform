import getTaskById from "@/actions/task/getTaskById";
import { taskQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { Client, Task, User } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

export default function useTaskById(
  taskId: number | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: taskQueryKey.taskById(taskId?.toString()!),
    queryFn: async () => {
      return getTaskById(taskId!, {
        include: {
          taskUser: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  image: true,
                },
              },
            },
          },
          client: true,
        },
      }) as Promise<
        Task & {
          taskUser: { id: number; user: User }[];
          client: Client;
        }
      >;
    },
    enabled: options?.enabled,
  });
}

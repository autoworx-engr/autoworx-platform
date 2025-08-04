import { updateTask } from "@/actions/task/dragTask";
import { Task } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskQueryKey } from "../../../_constant";
import { useDate } from "../../lib/useDate";
import useWeekStartEndDays from "../../lib/useWeekStartEndDays";
import { usePathname } from "next/navigation";

export default function useTaskMutation() {
  const queryClient = useQueryClient();
  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");

  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const pathname = usePathname();

  const isDayPage = pathname === "/dashboard/task/day";
  const isWeekPage = pathname === "/dashboard/task/week";
  return useMutation({
    mutationFn: async (updatedTodo: {
      id: number;
      date: Date;
      startTime: string;
      endTime: string;
      timezone: string;
    }) => {
      const response = await updateTask({
        ...updatedTodo,
      });
      return response.data as Task;
    },

    // 🔁 Optimistic update
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({
        queryKey: [taskQueryKey.allTasks, dateFormat],
      });

      await queryClient.cancelQueries({
        queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
      });

      queryClient.setQueryData(
        [taskQueryKey.allTaskByScroll],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map(
              (page: { totalTasks: number; data: Task[] }) => ({
                ...page,
                data: page.data.map((task: Task) =>
                  task.id === newTodo.id ? { ...task, ...newTodo } : task,
                ),
              }),
            ),
          };
        },
      );

      let previousTodos: Task[] = [];

      if (isDayPage) {
        previousTodos = queryClient.getQueryData([
          taskQueryKey.allTasks,
          dateFormat,
        ]) as Task[];
      } else if (isWeekPage) {
        previousTodos = queryClient.getQueryData([
          taskQueryKey.allTasks,
          weekStartDate,
          weekEndDate,
        ]) as Task[];
      }

      // update task for day view
      queryClient.setQueryData(
        [taskQueryKey.allTasks, dateFormat],
        (oldTaskData: Task[]) => {
          const updatedTaskData =
            oldTaskData && oldTaskData.length > 0
              ? oldTaskData.map((task: Task) =>
                  task.id === newTodo.id ? { ...task, ...newTodo } : task,
                )
              : [];
          return updatedTaskData;
        },
      );

      // update task for week view
      queryClient.setQueryData(
        [taskQueryKey.allTasks, weekStartDate, weekEndDate],
        (oldTaskData: Task[]) => {
          const updatedTaskData =
            oldTaskData && oldTaskData.length > 0
              ? oldTaskData.map((task: Task) =>
                  task.id === newTodo.id ? { ...task, ...newTodo } : task,
                )
              : [];
          return updatedTaskData;
        },
      );

      return { previousTodos };
    },

    // ❌ Rollback on error
    onError: (err, newTodo, context) => {
      console.error("Error updating task:", err);

      if (isDayPage) {
        // Rollback the day view optimistic update
        queryClient.setQueryData(
          [taskQueryKey.allTasks, dateFormat],
          context?.previousTodos,
        );
      } else if (isWeekPage) {
        // Rollback the week view optimistic update
        queryClient.setQueryData(
          [taskQueryKey.allTasks, dateFormat],
          context?.previousTodos,
        );
      }
    },

    // ✅ Refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [taskQueryKey.allTasks, dateFormat],
      });

      queryClient.invalidateQueries({
        queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
      });
    },
  });
}

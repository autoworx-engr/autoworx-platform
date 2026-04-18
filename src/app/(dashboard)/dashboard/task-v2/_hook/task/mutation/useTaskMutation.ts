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

    // Optimistic update — immediately reflect the change in the UI
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({
        queryKey: [taskQueryKey.allTasks, dateFormat],
      });

      await queryClient.cancelQueries({
        queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
      });

      const applyUpdate = (task: Task) =>
        task.id === newTodo.id ? { ...task, ...newTodo } : task;

      queryClient.setQueryData(
        [taskQueryKey.allTaskByScroll],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map(
              (page: { totalTasks: number; data: Task[] }) => ({
                ...page,
                data: page.data.map(applyUpdate),
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

      queryClient.setQueryData(
        [taskQueryKey.allTasks, dateFormat],
        (oldTaskData: Task[]) => {
          if (!oldTaskData || oldTaskData.length === 0)
            return oldTaskData ?? [];
          return oldTaskData.map(applyUpdate);
        },
      );

      queryClient.setQueryData(
        [taskQueryKey.allTasks, weekStartDate, weekEndDate],
        (oldTaskData: Task[]) => {
          if (!oldTaskData || oldTaskData.length === 0)
            return oldTaskData ?? [];
          return oldTaskData.map(applyUpdate);
        },
      );

      return { previousTodos };
    },

    // Update cache with actual server data — avoids the refetch flicker
    onSuccess: (data) => {
      if (!data) return;

      const applyServerData = (task: Task) =>
        task.id === data.id ? data : task;

      queryClient.setQueryData(
        [taskQueryKey.allTasks, dateFormat],
        (oldData: Task[]) => {
          if (!oldData) return oldData;
          return oldData.map(applyServerData);
        },
      );

      queryClient.setQueryData(
        [taskQueryKey.allTasks, weekStartDate, weekEndDate],
        (oldData: Task[]) => {
          if (!oldData) return oldData;
          return oldData.map(applyServerData);
        },
      );

      queryClient.setQueryData(
        [taskQueryKey.allTaskByScroll],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map(
              (page: { totalTasks: number; data: Task[] }) => ({
                ...page,
                data: page.data.map(applyServerData),
              }),
            ),
          };
        },
      );
    },

    // Rollback on error
    onError: (err, newTodo, context) => {
      console.error("Error updating task:", err);

      if (isDayPage) {
        queryClient.setQueryData(
          [taskQueryKey.allTasks, dateFormat],
          context?.previousTodos,
        );
      } else if (isWeekPage) {
        queryClient.setQueryData(
          [taskQueryKey.allTasks, weekStartDate, weekEndDate],
          context?.previousTodos,
        );
      }
    },
  });
}

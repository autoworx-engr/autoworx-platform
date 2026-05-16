import { updateTask } from "@/actions/task/dragTask";
import { taskQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { errorToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useCallback } from "react";

export function useScheduleTaskAt() {
  const queryClient = useQueryClient();
  const timezone = useCompanyTimezone();

  return useCallback(
    async (taskId: number, dateStr: string, time: string | null) => {
      let startTime: string | null = null;
      let endTime: string | null = null;
      if (time) {
        startTime = time.substring(0, 5);
        endTime = moment(startTime, "HH:mm").add(1, "hour").format("HH:mm");
      }
      try {
        const result = await updateTask({
          id: taskId,
          date: new Date(dateStr),
          startTime,
          endTime,
          timezone,
        });
        if (result.type !== "success") {
          errorToast("Failed to schedule task.");
          return;
        }
        queryClient.setQueriesData(
          { queryKey: [taskQueryKey.allTasks] },
          (oldData: any) => {
            if (!Array.isArray(oldData)) return oldData;
            const exists = oldData.some((t: any) => t.id === taskId);
            if (exists) {
              return oldData.map((task: any) =>
                task.id === taskId ? { ...task, ...result.data } : task,
              );
            }
            return [...oldData, result.data];
          },
        );
        queryClient.invalidateQueries({
          queryKey: taskQueryKey.allTaskByScroll,
        });
      } catch {
        errorToast("Failed to schedule task.");
      }
    },
    [queryClient, timezone],
  );
}

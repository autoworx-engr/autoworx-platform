import { updateTask } from "@/actions/task/dragTask";
import { taskQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { errorToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useCallback } from "react";

export function useCalendarExternalDrop() {
  const queryClient = useQueryClient();

  return useCallback(
    async (info: any) => {
      const draggedEl = info.draggedEl as HTMLElement;

      // Find task ID from the dragged element or its closest ancestor
      const taskIdStr =
        draggedEl.dataset.taskId ||
        draggedEl.closest("[data-task-id]")?.getAttribute("data-task-id");

      if (!taskIdStr) return;
      const taskId = Number(taskIdStr);
      if (!taskId) return;

      const dropDate = info.date as Date;
      const isAllDay = info.allDay;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const updatedDate = moment(dropDate).format("YYYY-MM-DD");
      let startTime: string | null = null;
      let endTime: string | null = null;

      if (!isAllDay) {
        startTime = moment(dropDate).format("HH:mm");
        endTime = moment(dropDate).add(1, "hour").format("HH:mm");
      }

      try {
        const result = await updateTask({
          id: taskId,
          date: new Date(updatedDate),
          startTime,
          endTime,
          timezone,
        });

        if (result.type !== "success") {
          errorToast("Failed to schedule task.");
          return;
        }

        // Update calendar cache with the newly scheduled task
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

        // Refresh sidebar to remove the now-scheduled task from the list
        queryClient.invalidateQueries({
          queryKey: taskQueryKey.allTaskByScroll,
        });
      } catch {
        errorToast("Failed to schedule task.");
      }
    },
    [queryClient],
  );
}

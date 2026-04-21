import { updateTask } from "@/actions/task/dragTask";
import { taskQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { errorToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useCallback } from "react";

export function useCalendarNativeDrop(storeDate: string | null) {
  const queryClient = useQueryClient();

  return useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const transferData = e.dataTransfer.getData("text/plain");
      if (!transferData?.startsWith("task|")) return;
      const taskId = Number(transferData.replace("task|", ""));
      if (!taskId) return;

      // Walk up the DOM to find FullCalendar's data-time and data-date attributes
      let el = e.target as HTMLElement | null;
      let timeStr: string | null = null;
      let dateStr: string | null = null;

      while (el) {
        if (!timeStr && el.dataset.time) timeStr = el.dataset.time;
        if (!dateStr && el.dataset.date) dateStr = el.dataset.date;
        if (timeStr && dateStr) break;
        el = el.parentElement;
      }

      // Must land on a recognizable slot
      if (!timeStr && !dateStr) return;

      const dropDate = dateStr ?? storeDate ?? moment().format("YYYY-MM-DD");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      let startTime: string | null = null;
      let endTime: string | null = null;

      if (timeStr) {
        startTime = timeStr.substring(0, 5); // "HH:mm" from "HH:mm:ss"
        endTime = moment(startTime, "HH:mm").add(1, "hour").format("HH:mm");
      }

      try {
        const result = await updateTask({
          id: taskId,
          date: new Date(dropDate),
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
    [queryClient, storeDate],
  );
}

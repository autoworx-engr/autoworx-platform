import { updateTask } from "@/actions/task/dragTask";
import { taskQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { errorToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useCallback } from "react";

function findDropDate(
  e: React.DragEvent<HTMLDivElement>,
  storeDate: string | null,
): string | null {
  const container = e.currentTarget as HTMLElement;
  const dropX = e.clientX;
  const dropY = e.clientY;

  // Week view: find which fc-timegrid-col column the X position falls in
  const timeGridCols = container.querySelectorAll<HTMLElement>(
    ".fc-timegrid-col[data-date]",
  );
  for (const col of Array.from(timeGridCols)) {
    const rect = col.getBoundingClientRect();
    if (dropX >= rect.left && dropX < rect.right) {
      return col.dataset.date ?? null;
    }
  }

  // Month view: find which fc-daygrid-day cell the cursor is over
  const dayCells = container.querySelectorAll<HTMLElement>(
    ".fc-daygrid-day[data-date]",
  );
  for (const cell of Array.from(dayCells)) {
    const rect = cell.getBoundingClientRect();
    if (
      dropX >= rect.left &&
      dropX < rect.right &&
      dropY >= rect.top &&
      dropY < rect.bottom
    ) {
      return cell.dataset.date ?? null;
    }
  }

  // Day view fallback: single column, use the store date
  return storeDate;
}

function findDropTime(e: React.DragEvent<HTMLDivElement>): string | null {
  let el = e.target as HTMLElement | null;
  while (el) {
    if (el.dataset.time) return el.dataset.time;
    el = el.parentElement;
  }
  return null;
}

export function useCalendarNativeDrop(storeDate: string | null) {
  const queryClient = useQueryClient();
  const timezone = useCompanyTimezone();

  return useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const transferData = e.dataTransfer.getData("text/plain");
      if (!transferData?.startsWith("task|")) return;
      const taskId = Number(transferData.replace("task|", ""));
      if (!taskId) return;

      const dateStr = findDropDate(e, storeDate);
      const timeStr = findDropTime(e);

      if (!dateStr) return;

      let startTime: string | null = null;
      let endTime: string | null = null;

      if (timeStr) {
        startTime = timeStr.substring(0, 5); // "HH:mm:ss" → "HH:mm"
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
    [queryClient, storeDate, timezone],
  );
}

import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";
import { updateTask } from "@/actions/task/dragTask";
import {
  appointmentQueryKey,
  taskQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";
import { errorToast } from "@/lib/toast";
import { EventDropArg } from "@fullcalendar/core";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useCallback } from "react";

export function useCalendarEventDateTimeUpdate() {
  const queryClient = useQueryClient();

  return useCallback(
    async (
      info: EventDropArg | { event: EventDropArg["event"]; revert: () => void },
    ) => {
      const eventType = info.event.extendedProps?.type as
        | "task"
        | "appointment"
        | "holiday"
        | undefined;

      if (!eventType || eventType === "holiday") {
        info.revert();
        return;
      }

      const eventStart = info.event.start;
      if (!eventStart) {
        info.revert();
        return;
      }

      const eventEnd =
        info.event.end ?? moment(eventStart).add(1, "hour").toDate();
      const updatedDate = moment(eventStart).format("YYYY-MM-DD");
      const updatedStartTime = moment(eventStart).format("HH:mm");
      const updatedEndTime = moment(eventEnd).format("HH:mm");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      try {
        if (eventType === "task") {
          const taskId = Number(String(info.event.id).replace("task-", ""));
          if (!taskId) {
            info.revert();
            return;
          }

          const result = await updateTask({
            id: taskId,
            date: new Date(updatedDate),
            startTime: updatedStartTime,
            endTime: updatedEndTime,
            timezone,
          });

          if (result.type !== "success") {
            info.revert();
            errorToast("Failed to update task date and time.");
            return;
          }

          queryClient.invalidateQueries({ queryKey: [taskQueryKey.allTasks] });
          return;
        }

        const appointmentId = Number(String(info.event.id).replace("apt-", ""));
        if (!appointmentId) {
          info.revert();
          return;
        }

        const result = await assignAppointmentDate({
          id: appointmentId,
          date: updatedDate,
          startTime: updatedStartTime,
          endTime: updatedEndTime,
          timezone,
        });

        if (result.type !== "success") {
          info.revert();
          errorToast("Failed to update appointment date and time.");
          return;
        }

        queryClient.invalidateQueries({
          queryKey: [appointmentQueryKey.allAppointments],
        });
      } catch {
        info.revert();
        errorToast("Failed to update event date and time.");
      }
    },
    [queryClient],
  );
}

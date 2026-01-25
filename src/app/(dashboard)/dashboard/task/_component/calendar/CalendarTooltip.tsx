"use client";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { TooltipContent } from "@/components/Tooltip";
import type { Appointment, Client, Task, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AppointmentTooltip from "./AppointmentTooltip";
import TaskTooltip from "./TaskTooltip";
import { appointmentQueryKey, taskQueryKey } from "../../_constant";
import { useDate } from "../../_hook/lib/useDate";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import useMonth from "../../_hook/lib/useMonth";
import moment from "moment";
import useWeekStartEndDays from "../../_hook/lib/useWeekStartEndDays";

type TCalendarTooltipProps = {
  event: (Task | Appointment) & {
    type: "appointment" | "task";
    client?: Client;
    assignedUsers?: User[];
  };
  onClose?: () => void;
};

export default function CalendarTooltip({
  event,
  onClose,
}: TCalendarTooltipProps) {
  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");
  const queryClient = useQueryClient();
  const month = useMonth();
  const formattedMonth = month
    ? moment(month, "YYYY-MM").format("MMMM")
    : moment().format("MMMM");

  const formattedYear = month
    ? moment(month, "YYYY-MM").year()
    : moment().year();

  const { weekStartDate, weekEndDate } = useWeekStartEndDays();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentOpen] = useState(false);

  const revalidateTaskQueries = () => {
    // Invalidate queries for tasks based on the current month and year
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, formattedMonth, formattedYear],
    });

    // Invalidate queries for tasks based on the current week
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
    });

    // Invalidate queries for tasks based on the current date
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, dateFormat],
    });
  };

  const revalidateAppointmentQueries = () => {
    // Invalidate queries for appointments based on the current month and year
    queryClient.invalidateQueries({
      queryKey: [
        appointmentQueryKey.allAppointments,
        formattedMonth,
        formattedYear,
      ],
    });
    // Invalidate queries for appointments based on the current week
    queryClient.invalidateQueries({
      queryKey: [
        appointmentQueryKey.allAppointments,
        weekStartDate,
        weekEndDate,
      ],
    });
    // Invalidate queries for appointments based on the current DATE
    queryClient.invalidateQueries({
      queryKey: [appointmentQueryKey.allAppointments, dateFormat],
    });
  };

  if (!event) return null;

  let editModalContent = null;
  if (event.type === "appointment") {
    editModalContent = (
      <AppointmentCreateOrEdit
        fromEdit
        appointmentId={event.id}
        isModalOpen={isAppointmentModalOpen}
        setIsModalOpen={setIsAppointmentOpen}
        onAppointmentUpdated={revalidateAppointmentQueries}
        onAppointmentDeleted={revalidateAppointmentQueries}
      />
    );
  } else if (event.type === "task") {
    editModalContent = (
      <TaskCreateOrEdit
        fromEdit
        taskId={event.id}
        onTaskUpdated={revalidateTaskQueries}
        isModalOpen={isTaskModalOpen}
        setIsModalOpen={setIsTaskModalOpen}
        onTaskDelete={revalidateTaskQueries}
      />
    );
  }

  return (
    <>
      <TooltipPortal>
        <TooltipContent
          className="w-72 rounded-md border border-slate-400 bg-background p-3"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {event.type === "appointment" ? (
            <AppointmentTooltip
              event={event as Appointment}
              onModalOpen={() => {
                setIsAppointmentOpen(true);
              }}
              onClose={onClose}
            />
          ) : (
            <TaskTooltip
              event={event as Task}
              onModalOpen={() => {
                setIsTaskModalOpen(true);
              }}
              onClose={onClose}
            />
          )}
        </TooltipContent>
      </TooltipPortal>
      {editModalContent}
    </>
  );
}

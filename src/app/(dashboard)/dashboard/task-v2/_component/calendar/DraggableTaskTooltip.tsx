import {
  appointmentQueryKey,
  taskQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";
import { TooltipTrigger } from "@/components/Tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { ReactElement } from "react";
import { useDrag } from "react-dnd";
import { useDate } from "../../../task/_hook/lib/useDate";
import useWeekStartEndDays from "../../../task/_hook/lib/useWeekStartEndDays";

type TDraggableTaskTooltipProps = {
  children: ReactElement;
  style: any;
  task: any;
};

export default function DraggableTaskTooltip({
  children,
  style,
  task,
  ...props
}: TDraggableTaskTooltipProps) {
  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");
  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  const handleDragStart = (event: any) => {
    event.dataTransfer.setData("text/plain", `${task.type}|${task.id}`);
  };

  const queryClient = useQueryClient();

  const revalidateAppointmentQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [appointmentQueryKey.allAppointments, dateFormat],
    });

    queryClient.invalidateQueries({
      queryKey: [
        appointmentQueryKey.allAppointments,
        weekStartDate,
        weekEndDate,
      ],
    });
  };

  const revalidateTaskQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, dateFormat],
    });

    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
    });
  };

  const event = (
    <TooltipTrigger
      {...props}
      // @ts-ignore
      ref={drag}
      onDragStart={handleDragStart}
      // onMouseDown={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (e.button === 0) {
          return;
        }
      }}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "pointer",
      }}
      {...props}
    >
      {children}
    </TooltipTrigger>
  );

  // return (
  //   <>
  //     {task.type === "task" && (
  //       <TaskCreateOrEdit
  //         fromEdit
  //         taskId={task.id}
  //         onTaskUpdated={revalidateTaskQueries}
  //         onTaskDelete={revalidateTaskQueries}
  //         triggerIcon={event}
  //       />
  //     )}
  //     {task.type === "appointment" && (
  //       <AppointmentCreateOrEdit
  //         fromEdit
  //         appointmentId={task.id}
  //         triggerIcon={event}
  //         onAppointmentUpdated={revalidateAppointmentQueries}
  //         onAppointmentDeleted={revalidateAppointmentQueries}
  //       />
  //     )}
  //   </>
  // );

  return event;
}

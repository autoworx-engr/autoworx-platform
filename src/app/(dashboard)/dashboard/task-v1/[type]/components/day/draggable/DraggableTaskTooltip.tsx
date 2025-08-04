import { TooltipTrigger } from "@/components/Tooltip";
import { usePopupStore } from "@/stores/popup";
import React, { ReactElement } from "react";
import { useDrag } from "react-dnd";

export default function DraggableDayTooltip({
  children,
  style,
  task,
  updateTaskData,
  updateAppointmentData,
  onNavigate,
  ...props
}: {
  children: ReactElement;
  style: any;
  task: any;
  updateTaskData: {
    event: any;
    companyUsers: any;
  };
  updateAppointmentData: {
    appointment: any;
    employees: any;
    customers: any;
    vehicles: any;
    templates: any;
    settings: any;
  };
  onNavigate?: () => void;
}) {
  const { open } = usePopupStore();
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  const handleDragStart = (event: any) => {
    event.dataTransfer.setData("text/plain", `${task.type}|${task.id}`);
  };

  const { event, companyUsers } = updateTaskData;
  const { appointment, customers, employees, vehicles, templates, settings } =
    updateAppointmentData;

  const handleClick = () => {
    // If navigation handler is provided (e.g., from Week view), use it
    if (onNavigate) {
      onNavigate();
    } else {
      // Otherwise, open edit modal (e.g., Day view behavior)
      if (event.type === "task") {
        open("UPDATE_TASK", {
          task: event,
          companyUsers,
        });
      } else {
        open("UPDATE_APPOINTMENT", {
          appointment,
          employees,
          customers,
          vehicles,
          templates,
          settings,
        });
      }
    }
  };

  return (
    <TooltipTrigger
      {...props}
      // @ts-ignore
      ref={drag}
      onDragStart={handleDragStart}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "pointer",
      }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </TooltipTrigger>
  );
}

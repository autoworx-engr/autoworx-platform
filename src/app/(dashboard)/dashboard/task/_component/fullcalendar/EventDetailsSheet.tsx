"use client";

import { Button } from "@/components/ui/button";
import { deleteTask } from "@/actions/task/deleteTask";
import {
  appointmentQueryKey,
  taskQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";
import { errorToast, successToast } from "@/lib/toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CheckCircle, Edit, MessageSquare } from "lucide-react";
import { Popconfirm } from "antd";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CustomEventProps } from "../../_utils/calendar.types";
import { isHexColor, lightenHex, darkenHex } from "../../_utils/colorUtils";
import { AppointmentDetailCard } from "./AppointmentDetailCard";
import { TaskDetailCard } from "./TaskDetailCard";

interface EventDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEvent: any;
  onEditTask: () => void;
  onEditAppointment: () => void;
}

export const EventDetailsSheet = ({
  isOpen,
  onOpenChange,
  selectedEvent,
  onEditTask,
  onEditAppointment,
}: EventDetailsSheetProps) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  if (!selectedEvent) return null;

  const props = selectedEvent.extendedProps as CustomEventProps;
  const eventType = selectedEvent.extendedProps?.type as
    | "task"
    | "appointment"
    | "holiday"
    | undefined;
  const originalData = selectedEvent.extendedProps?.originalData;

  const taskId =
    eventType === "task"
      ? Number(
          originalData?.id ?? String(selectedEvent.id).replace("task-", ""),
        )
      : null;
  const appointmentId =
    eventType === "appointment"
      ? Number(originalData?.id ?? String(selectedEvent.id).replace("apt-", ""))
      : null;
  const appointmentClientId =
    eventType === "appointment"
      ? Number(originalData?.clientId ?? originalData?.client?.id ?? 0)
      : 0;

  const appointmentClientName =
    eventType === "appointment"
      ? [originalData?.client?.firstName, originalData?.client?.lastName]
          .filter(Boolean)
          .join(" ") || "No client"
      : "";

  const appointmentClientEmail =
    eventType === "appointment"
      ? originalData?.client?.email || "No email"
      : "";

  const appointmentClientPhone =
    eventType === "appointment"
      ? originalData?.client?.mobile || "No phone"
      : "";
  const appointmentVehicle =
    eventType === "appointment" && originalData?.vehicle
      ? `${originalData?.vehicle?.year} ${originalData?.vehicle?.make} ${originalData?.vehicle?.model}`
      : "";

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const timeRange = `${
    selectedEvent.start ? formatTime(selectedEvent.start) : "N/A"
  }${selectedEvent.end ? ` to ${formatTime(selectedEvent.end)}` : ""}`;

  // Appointment: icon colors from category color
  const catColor = props?.serviceCategoryColor;
  const aptIconStyle = isHexColor(catColor)
    ? {
        backgroundColor: lightenHex(catColor, 0.15),
        color: darkenHex(catColor, 0.6),
      }
    : undefined;
  const aptIconClass = isHexColor(catColor) ? "" : "bg-blue-50 text-blue-600";

  // Task: icon colors from priority
  const priority = originalData?.priority as string | undefined;
  const taskIconClass =
    priority === "High"
      ? "bg-red-50 text-red-600"
      : priority === "Low"
        ? "bg-green-50 text-green-600"
        : "bg-amber-50 text-amber-600";
  const taskPriorityTextClass =
    priority === "High"
      ? "text-red-600"
      : priority === "Low"
        ? "text-green-600"
        : "text-amber-600";

  const invalidateCalendarQueries = () => {
    queryClient.invalidateQueries({ queryKey: [taskQueryKey.allTasks] });
    queryClient.invalidateQueries({
      queryKey: [appointmentQueryKey.allAppointments],
    });
    queryClient.invalidateQueries({ queryKey: taskQueryKey.allTaskByScroll });
  };

  const handleTaskComplete = async () => {
    if (!taskId) {
      errorToast("Task not found.");
      return;
    }

    const result = await deleteTask(taskId);
    if (result.type === "success") {
      successToast("Task Completed successfully.");
      invalidateCalendarQueries();
      onOpenChange(false);
      return;
    }

    errorToast("Failed to complete task. Please try again.");
  };

  const handleMessageClient = () => {
    if (!appointmentClientId) {
      errorToast("Client not found for this appointment.");
      return;
    }

    onOpenChange(false);
    router.push(
      `/dashboard/communication/client/${appointmentClientId}?chat=true`,
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-md">
        <div className="flex flex-col h-full bg-slate-50/50">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                {eventType && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mb-3 ${
                      eventType === "appointment"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : eventType === "task"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-green-100 text-green-800 border-green-200"
                    }`}
                  >
                    {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                  </span>
                )}
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                  {selectedEvent.title}
                </h2>
              </div>

              <div className="space-y-5">
                {eventType === "appointment" && (
                  <AppointmentDetailCard
                    timeRange={timeRange}
                    clientName={appointmentClientName}
                    clientEmail={appointmentClientEmail}
                    clientPhone={appointmentClientPhone}
                    vehicle={appointmentVehicle}
                    invoiceGrandTotal={originalData?.invoiceGrandTotal}
                    serviceCategoryName={originalData?.serviceCategory?.name}
                    assignedUsers={originalData?.assignedUsers}
                    aptIconClass={aptIconClass}
                    aptIconStyle={aptIconStyle}
                  />
                )}

                {eventType === "task" && (
                  <TaskDetailCard
                    timeRange={timeRange}
                    priority={originalData?.priority}
                    taskUsers={originalData?.taskUser}
                    description={originalData?.description}
                    taskIconClass={taskIconClass}
                    taskPriorityTextClass={taskPriorityTextClass}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-white space-y-3 shrink-0">
            <div className="flex gap-3">
              {eventType === "task" && taskId ? (
                <Button
                  variant="outline"
                  className="flex-1 justify-center shadow-sm"
                  onClick={onEditTask}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task
                </Button>
              ) : null}

              {eventType === "appointment" && appointmentId ? (
                <Button
                  variant="outline"
                  className="flex-1 justify-center shadow-sm"
                  onClick={onEditAppointment}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Appointment
                </Button>
              ) : null}

              {eventType === "task" ? (
                <Popconfirm
                  title="Complete Task"
                  description="Are you sure you want to mark this task as completed?"
                  okText="Yes"
                  cancelText="No"
                  trigger="click"
                  zIndex={9999}
                  getPopupContainer={(triggerNode) =>
                    triggerNode?.parentElement ?? document.body
                  }
                  onConfirm={handleTaskComplete}
                >
                  <Button className="flex-1 justify-center shadow-sm bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                </Popconfirm>
              ) : null}
            </div>

            {eventType === "appointment" && (
              <Button
                className="w-full justify-center shadow-sm"
                onClick={handleMessageClient}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Message Client
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

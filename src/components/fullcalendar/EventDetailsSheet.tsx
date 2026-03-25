"use client";

import { Button } from "@/components/ui/button";
import { deleteTask } from "@/actions/task/deleteTask";
import {
  appointmentQueryKey,
  taskQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";
import { errorToast, successToast } from "@/lib/toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  CheckCircle,
  Clock3,
  Edit,
  Mail,
  MessageSquare,
  Phone,
  User,
  Zap,
} from "lucide-react";
import { Popconfirm } from "antd";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CustomEventProps } from "./types";

interface EventDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEvent: any; // We can improve this type later if needed
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

  const timeRange = `${
    selectedEvent.start
      ? selectedEvent.start.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "N/A"
  }${
    selectedEvent.end
      ? ` to ${selectedEvent.end.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}`
      : ""
  }`;

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
      <SheetContent side="right">
        <div className="flex flex-col h-full bg-white">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedEvent.title}
              </h2>

              {eventType === "appointment" && (
                <>
                  <div className="flex items-center gap-2  font-medium text-gray-700">
                    <Clock3 className="h-5 w-5 text-gray-500" />
                    <span>
                      <span className="text-gray-600">Time:</span> {timeRange}
                    </span>
                  </div>

                  <div className="flex items-center gap-2  font-medium text-gray-700">
                    <User className="h-5 w-5 text-gray-500" />
                    <span>
                      <span className="text-gray-600">Client:</span>{" "}
                      {appointmentClientName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2  font-medium text-gray-700">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <span>
                      <span className="text-gray-600">Email:</span>{" "}
                      {appointmentClientEmail}
                    </span>
                  </div>

                  <div className="flex items-center gap-2  font-medium text-gray-700">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <span>
                      <span className="text-gray-600">Phone:</span>{" "}
                      {appointmentClientPhone}
                    </span>
                  </div>
                </>
              )}

              {eventType === "task" && (
                <>
                  <div className="flex items-center gap-2  font-semibold text-gray-700">
                    <Zap className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-600">Priority:</span>
                    <span className="uppercase text-amber-500">
                      {originalData?.priority || "N/A"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-[20px] font-semibold  text-slate-500">
                      Description:
                    </h3>
                    <p className="text-gray-700">
                      {originalData?.description || "No description provided."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t space-y-3 bg-white">
            <div className="flex gap-4">
              {eventType === "task" && taskId ? (
                <Button
                  variant="outline"
                  className="flex-1 justify-center h-11 border-gray-300 hover:bg-gray-50 font-medium"
                  onClick={onEditTask}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              ) : null}

              {eventType === "appointment" && appointmentId ? (
                <Button
                  variant="outline"
                  className="flex-1 justify-center h-11 border-gray-300 hover:bg-gray-50 font-medium"
                  onClick={onEditAppointment}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
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
                  <Button
                    variant="outline"
                    className="flex-1 justify-center h-11 border-gray-300 hover:bg-gray-50 font-medium"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                </Popconfirm>
              ) : null}
            </div>

            {eventType === "appointment" && (
              <Button
                variant="outline"
                className="w-full justify-center h-11 border-gray-300 hover:bg-gray-50 font-medium"
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

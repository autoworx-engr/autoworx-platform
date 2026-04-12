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
  Car,
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
  const appointmentVehicle =
    eventType === "appointment" && originalData?.vehicle
      ? `${originalData?.vehicle?.year} ${originalData?.vehicle?.make} ${originalData?.vehicle?.model}`
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
      <SheetContent side="right" className="p-0 sm:max-w-md">
        <div className="flex flex-col h-full bg-slate-50/50">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
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

              {/* Info Card */}
              <div className="space-y-5">
                {eventType === "appointment" && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <Clock3 className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                          Time
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {timeRange}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0">
                        <User className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                          Client
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {appointmentClientName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0">
                        <Mail className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                          Email
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {appointmentClientEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0">
                        <Phone className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                          Phone
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {appointmentClientPhone}
                        </p>
                      </div>
                    </div>
                    {appointmentVehicle && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0">
                          <Car className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                            Vehicle
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {appointmentVehicle}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {eventType === "task" && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                        <Zap className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                          Priority
                        </p>
                        <p className="text-sm font-bold text-amber-600 uppercase">
                          {originalData?.priority || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      {originalData?.taskUser &&
                        originalData.taskUser.length > 0 && (
                          <div className="flex items-center gap-1 mb-2 flex-wrap text-gray-500 text-xs ">
                            <span className="font-medium uppercase tracking-wider">
                              Assigned to:
                            </span>
                            <span>
                              {originalData.taskUser
                                .map(
                                  (tu: {
                                    user?: {
                                      firstName: string;
                                      lastName: string;
                                    };
                                  }) =>
                                    tu?.user
                                      ? `${tu.user.firstName} ${tu.user.lastName}`
                                      : null,
                                )
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}{" "}
                      <p className="text-xs pt-2 border-t font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Description
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {originalData?.description ||
                          "No description provided."}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
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

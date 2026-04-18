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
  DollarSign,
  Edit,
  Mail,
  MessageSquare,
  Phone,
  Tag,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Popconfirm } from "antd";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CustomEventProps } from "../../_utils/calendar.types";
import { isHexColor, lightenHex, darkenHex } from "../../_utils/colorUtils";

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
        : "bg-amber-50 text-amber-600"; // Medium or default
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
                    {[
                      {
                        icon: <Clock3 className="size-4" />,
                        label: "Time",
                        value: timeRange,
                      },
                      {
                        icon: <User className="size-4" />,
                        label: "Client",
                        value: appointmentClientName,
                      },
                      {
                        icon: <Mail className="size-4" />,
                        label: "Email",
                        value: appointmentClientEmail,
                      },
                      {
                        icon: <Phone className="size-4" />,
                        label: "Phone",
                        value: appointmentClientPhone,
                      },
                      ...(appointmentVehicle
                        ? [
                            {
                              icon: <Car className="size-4" />,
                              label: "Vehicle",
                              value: appointmentVehicle,
                            },
                          ]
                        : []),
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
                          style={aptIconStyle}
                        >
                          {icon}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                            {label}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}

                    {originalData?.invoiceGrandTotal != null &&
                      Number(originalData.invoiceGrandTotal) > 0 && (
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
                            style={aptIconStyle}
                          >
                            <DollarSign className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                              Estimate Price
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              $
                              {Number(originalData.invoiceGrandTotal).toFixed(
                                2,
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                    {originalData?.serviceCategory?.name && (
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
                          style={aptIconStyle}
                        >
                          <Tag className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                            Category
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {originalData.serviceCategory.name}
                          </p>
                        </div>
                      </div>
                    )}

                    {originalData?.assignedUsers &&
                      originalData.assignedUsers.length > 0 && (
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
                            style={aptIconStyle}
                          >
                            <Users className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                              Technicians
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {originalData.assignedUsers
                                .map((u: any) =>
                                  [u?.firstName, u?.lastName]
                                    .filter(Boolean)
                                    .join(" "),
                                )
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        </div>
                      )}
                  </>
                )}

                {eventType === "task" && (
                  <>
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}
                      >
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
                      <div
                        className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}
                      >
                        <Zap className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                          Priority
                        </p>
                        <p
                          className={`text-sm font-bold uppercase ${taskPriorityTextClass}`}
                        >
                          {originalData?.priority || "N/A"}
                        </p>
                      </div>
                    </div>

                    {originalData?.taskUser &&
                      originalData.taskUser.length > 0 && (
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}
                          >
                            <Users className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                              Assigned To
                            </p>
                            <p className="text-sm font-medium text-gray-900">
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
                            </p>
                          </div>
                        </div>
                      )}

                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${taskIconClass}`}
                      >
                        <Edit className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                          Description
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {originalData?.description ||
                            "No description provided."}
                        </p>
                      </div>
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

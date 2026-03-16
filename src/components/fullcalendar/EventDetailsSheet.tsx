"use client";

import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
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
  DollarSign,
  Edit,
  FileText,
  MessageSquare,
  User,
} from "lucide-react";
import { Popconfirm } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomEventProps } from "./types";
import { getServiceColor } from "./utils";

interface EventDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEvent: any; // We can improve this type later if needed
}

export const EventDetailsSheet = ({
  isOpen,
  onOpenChange,
  selectedEvent,
}: EventDetailsSheetProps) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);
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
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b">
            <div
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
              style={{
                background: `linear-gradient(135deg, ${getServiceColor(props?.serviceType).gradient[0]} 0%, ${getServiceColor(props?.serviceType).gradient[1]} 100%)`,
                color: getServiceColor(props?.serviceType).accentColor,
              }}
            >
              {props?.serviceType}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Title & Car */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedEvent.title}
                </h2>
                <p className="text-lg text-gray-600 font-medium">
                  {props?.carModel}
                </p>
              </div>

              {/* Revenue Box */}
              <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Revenue
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {props?.price}
                    </p>
                  </div>
                </div>
              </div>

              {/* Create Estimate Button */}
              <Button
                variant="outline"
                className="w-full justify-center text-sm font-medium border-gray-300 hover:bg-gray-50"
              >
                <FileText className="mr-2 h-5 w-5" />
                Create Estimate
              </Button>

              {/* Technicians */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Technicians
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {props?.technicians && props.technicians.length > 0 ? (
                    props.technicians.map((tech: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full"
                      >
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {tech}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No technicians assigned
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 italic">
                  Invoice required to assign technicians
                </p>
              </div>

              {/* Time */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Time
                </h3>
                <div className="flex items-center gap-2 text-gray-900 text-lg font-medium">
                  {selectedEvent.start &&
                    selectedEvent.start.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  {selectedEvent.end && " - "}
                  {selectedEvent.end &&
                    selectedEvent.end.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Phone
                </h3>
                <div className="flex items-center gap-2 text-gray-900 text-lg font-medium">
                  {props?.phone || "No phone number"}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Notes
                </h3>
                <p className="text-gray-900 text-lg font-normal">
                  {props?.description || "No notes"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t space-y-3 bg-white">
            <div className="flex gap-4">
              {eventType === "task" && taskId ? (
                <TaskCreateOrEdit
                  triggerIcon={
                    <Button
                      variant="outline"
                      className="flex-1 justify-center h-11 border-gray-300 hover:bg-gray-50 font-medium"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  }
                  taskId={taskId}
                  fromEdit
                  onTaskUpdated={() => {
                    invalidateCalendarQueries();
                    onOpenChange(false);
                  }}
                  onTaskDelete={() => {
                    invalidateCalendarQueries();
                    onOpenChange(false);
                  }}
                />
              ) : null}

              {eventType === "appointment" && appointmentId ? (
                <AppointmentCreateOrEdit
                  triggerIcon={
                    <Button
                      variant="outline"
                      className="flex-1 justify-center h-11 border-gray-300 hover:bg-gray-50 font-medium"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  }
                  fromEdit
                  appointmentId={appointmentId}
                  onAppointmentUpdated={() => {
                    invalidateCalendarQueries();
                    onOpenChange(false);
                  }}
                  onAppointmentDeleted={() => {
                    invalidateCalendarQueries();
                    onOpenChange(false);
                  }}
                />
              ) : null}

              {eventType === "task" ? (
                <Popconfirm
                  style={{ zIndex: 10000000 }}
                  title="Complete Task"
                  description="Are you sure you want to mark this task as completed?"
                  okText="Yes"
                  cancelText="No"
                  open={isCompleteConfirmOpen}
                  onOpenChange={setIsCompleteConfirmOpen}
                  onConfirm={() => {
                    setIsCompleteConfirmOpen(false);
                    handleTaskComplete();
                  }}
                  onCancel={() => setIsCompleteConfirmOpen(false)}
                >
                  <Button
                    variant="outline"
                    className="flex-1 justify-center h-11 border-gray-300 hover:bg-gray-50 font-medium"
                    onClick={() => setIsCompleteConfirmOpen(true)}
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

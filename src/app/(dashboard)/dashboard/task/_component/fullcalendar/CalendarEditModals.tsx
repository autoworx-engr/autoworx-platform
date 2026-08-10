"use client";

import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { Dispatch, SetStateAction } from "react";

interface CalendarEditModalsProps {
  isTaskEditOpen: boolean;
  setIsTaskEditOpen: Dispatch<SetStateAction<boolean>>;
  taskId?: number;
  isAppointmentEditOpen: boolean;
  setIsAppointmentEditOpen: Dispatch<SetStateAction<boolean>>;
  appointmentId?: number;
  onMutated: () => void;
}

export function CalendarEditModals({
  isTaskEditOpen,
  setIsTaskEditOpen,
  taskId,
  isAppointmentEditOpen,
  setIsAppointmentEditOpen,
  appointmentId,
  onMutated,
}: CalendarEditModalsProps) {
  return (
    <>
      {isTaskEditOpen && taskId && (
        <TaskCreateOrEdit
          isModalOpen={isTaskEditOpen}
          setIsModalOpen={setIsTaskEditOpen}
          taskId={taskId}
          fromEdit
          onTaskUpdated={() => {
            onMutated();
            setIsTaskEditOpen(false);
          }}
          onTaskDelete={() => {
            onMutated();
            setIsTaskEditOpen(false);
          }}
        />
      )}
      {isAppointmentEditOpen && appointmentId && (
        <AppointmentCreateOrEdit
          isModalOpen={isAppointmentEditOpen}
          setIsModalOpen={setIsAppointmentEditOpen}
          appointmentId={appointmentId}
          fromEdit
          onAppointmentUpdated={() => {
            onMutated();
            setIsAppointmentEditOpen(false);
          }}
          onAppointmentDeleted={() => {
            onMutated();
            setIsAppointmentEditOpen(false);
          }}
        />
      )}
    </>
  );
}

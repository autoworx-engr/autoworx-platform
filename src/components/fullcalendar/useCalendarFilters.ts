import { useMemo } from "react";
import { buildCalendarEvents } from "./calendarEventMapper";

export type CalendarFilterOption = {
  id: number;
  name: string;
};

type UseCalendarFiltersParams = {
  tasks: any[];
  appointments: any[];
  holidays: any[];
  selectedTaskUserIds: number[];
  selectedAppointmentTechnicianIds: number[];
};

export function useCalendarFilters({
  tasks,
  appointments,
  holidays,
  selectedTaskUserIds,
  selectedAppointmentTechnicianIds,
}: UseCalendarFiltersParams) {
  const taskUserOptions = useMemo(() => {
    const usersMap = new Map<number, CalendarFilterOption>();

    tasks.forEach((task: any) => {
      task?.taskUser?.forEach((taskUser: any) => {
        const user = taskUser?.user;
        const userId = Number(user?.id ?? taskUser?.userId);
        if (!userId) {
          return;
        }

        const fullName = [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        usersMap.set(userId, {
          id: userId,
          name: fullName || `User ${userId}`,
        });
      });
    });

    return Array.from(usersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [tasks]);

  const appointmentTechnicianOptions = useMemo(() => {
    const techniciansMap = new Map<number, CalendarFilterOption>();

    appointments.forEach((appointment: any) => {
      appointment?.assignedUsers?.forEach((assignedUser: any) => {
        const userId = Number(assignedUser?.id);
        if (!userId) {
          return;
        }

        const fullName = [assignedUser?.firstName, assignedUser?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        techniciansMap.set(userId, {
          id: userId,
          name: fullName || `Technician ${userId}`,
        });
      });
    });

    return Array.from(techniciansMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [appointments]);

  const filteredTasks = useMemo(() => {
    if (selectedTaskUserIds.length === 0) {
      return tasks;
    }

    const selectedSet = new Set(selectedTaskUserIds);
    return tasks.filter((task: any) =>
      task?.taskUser?.some((taskUser: any) => {
        const id = Number(taskUser?.userId ?? taskUser?.user?.id);
        return selectedSet.has(id);
      }),
    );
  }, [tasks, selectedTaskUserIds]);

  const filteredAppointments = useMemo(() => {
    if (selectedAppointmentTechnicianIds.length === 0) {
      return appointments;
    }

    const selectedSet = new Set(selectedAppointmentTechnicianIds);
    return appointments.filter((appointment: any) =>
      appointment?.assignedUsers?.some((user: any) =>
        selectedSet.has(Number(user?.id)),
      ),
    );
  }, [appointments, selectedAppointmentTechnicianIds]);

  const events = useMemo(() => {
    return buildCalendarEvents({
      appointments: filteredAppointments,
      tasks: filteredTasks,
      holidays,
    });
  }, [filteredTasks, filteredAppointments, holidays]);

  return {
    taskUserOptions,
    appointmentTechnicianOptions,
    filteredTasks,
    filteredAppointments,
    events,
  };
}

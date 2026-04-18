import { useMemo } from "react";
import { buildCalendarEvents } from "../../_utils/calendarEventMapper";

export type CalendarFilterOption = {
  id: number;
  name: string;
};

type UseCalendarFiltersParams = {
  tasks: any[];
  appointments: any[];
  holidays: any[];
  selectedTeamMateIds: number[];
  selectedCategoryIds: number[];
  dateRange: { start: string; end: string };
  weekendDays?: string[];
};

export function useCalendarFilters({
  tasks,
  appointments,
  holidays,
  selectedTeamMateIds,
  selectedCategoryIds,
  dateRange,
  weekendDays,
}: UseCalendarFiltersParams) {
  // Merge task users and appointment technicians into a single "team mate" list
  const teamMateOptions = useMemo(() => {
    const matesMap = new Map<number, CalendarFilterOption>();

    tasks.forEach((task: any) => {
      task?.taskUser?.forEach((taskUser: any) => {
        const user = taskUser?.user;
        const userId = Number(user?.id ?? taskUser?.userId);
        if (!userId) return;
        const fullName = [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        matesMap.set(userId, {
          id: userId,
          name: fullName || `User ${userId}`,
        });
      });
    });

    appointments.forEach((appointment: any) => {
      appointment?.assignedUsers?.forEach((assignedUser: any) => {
        const userId = Number(assignedUser?.id);
        if (!userId) return;
        const fullName = [assignedUser?.firstName, assignedUser?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        matesMap.set(userId, {
          id: userId,
          name: fullName || `Technician ${userId}`,
        });
      });
    });

    return Array.from(matesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [tasks, appointments]);

  const categoryOptions = useMemo(() => {
    const catMap = new Map<number, CalendarFilterOption>();
    appointments.forEach((appointment: any) => {
      const cat = appointment?.serviceCategory;
      if (cat?.id) {
        catMap.set(Number(cat.id), { id: Number(cat.id), name: cat.name });
      }
    });
    return Array.from(catMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [appointments]);

  const filteredTasks = useMemo(() => {
    if (selectedTeamMateIds.length === 0) return tasks;
    const selectedSet = new Set(selectedTeamMateIds);
    return tasks.filter((task: any) =>
      task?.taskUser?.some((taskUser: any) => {
        const id = Number(taskUser?.userId ?? taskUser?.user?.id);
        return selectedSet.has(id);
      }),
    );
  }, [tasks, selectedTeamMateIds]);

  const filteredAppointments = useMemo(() => {
    if (selectedCategoryIds.length === 0) return appointments;
    const catSet = new Set(selectedCategoryIds);
    return appointments.filter((appointment: any) =>
      catSet.has(Number(appointment?.serviceCategory?.id)),
    );
  }, [appointments, selectedCategoryIds]);

  const events = useMemo(() => {
    return buildCalendarEvents({
      appointments: filteredAppointments,
      tasks: filteredTasks,
      holidays,
      dateRange,
      weekendDays,
    });
  }, [filteredTasks, filteredAppointments, holidays, dateRange, weekendDays]);

  return {
    teamMateOptions,
    categoryOptions,
    filteredTasks,
    filteredAppointments,
    events,
  };
}

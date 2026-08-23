import { useMemo } from "react";
import { buildCalendarEvents } from "../../_utils/calendarEventMapper";

export type CalendarFilterOption = {
  id: number;
  name: string;
};

type TaskUserEntry = {
  userId: number;
  user?: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
  };
};

type CalendarTask = {
  taskUser?: TaskUserEntry[];
  [key: string]: unknown;
};

type UseCalendarFiltersParams = {
  tasks: CalendarTask[];
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
  // Merge task users and appointment technicians into a single "teammate" list
  const teamMateOptions = useMemo(() => {
    const matesMap = new Map<number, CalendarFilterOption>();

    tasks.forEach((task) => {
      task?.taskUser?.forEach((taskUser) => {
        const userId = Number(taskUser.user?.id ?? taskUser.userId);
        if (!userId) return;
        const fullName = [taskUser.user?.firstName, taskUser.user?.lastName]
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
    if (selectedTeamMateIds.length === 0) {
      return selectedCategoryIds.length > 0 ? [] : tasks;
    }

    const selectedSet = new Set(selectedTeamMateIds);
    return tasks.filter((task) =>
      task?.taskUser?.some((taskUser) => {
        const id = Number(taskUser.user?.id ?? taskUser.userId);
        return selectedSet.has(id);
      }),
    );
  }, [tasks, selectedTeamMateIds, selectedCategoryIds]);

  const filteredAppointments = useMemo(() => {
    const hasTeamMateFilter = selectedTeamMateIds.length > 0;
    const hasCategoryFilter = selectedCategoryIds.length > 0;

    if (!hasTeamMateFilter && !hasCategoryFilter) return appointments;

    const selectedTeamMateSet = new Set(selectedTeamMateIds);
    const selectedCategorySet = new Set(selectedCategoryIds);

    return appointments.filter((appointment: any) => {
      const matchesTeamMate = hasTeamMateFilter
        ? appointment?.assignedUsers?.some((assignedUser: any) =>
            selectedTeamMateSet.has(Number(assignedUser?.id)),
          )
        : false;

      const matchesCategory = hasCategoryFilter
        ? selectedCategorySet.has(Number(appointment?.serviceCategory?.id))
        : false;

      if (hasTeamMateFilter && hasCategoryFilter) {
        return matchesTeamMate || matchesCategory;
      }

      return hasTeamMateFilter ? matchesTeamMate : matchesCategory;
    });
  }, [appointments, selectedTeamMateIds, selectedCategoryIds]);

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

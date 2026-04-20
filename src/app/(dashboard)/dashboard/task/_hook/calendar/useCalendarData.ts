import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import useGetHolidays from "@/app/(dashboard)/dashboard/task/_hook/appointment/query/useGetHolidays";
import useTaskQuery from "@/app/(dashboard)/dashboard/task/_hook/task/query/useTaskQuery";
import useAppointmentQuery from "@/app/(dashboard)/dashboard/task/_hook/appointment/query/useAppointmentQuery";
import {
  appointmentQueryKey,
  taskQueryKey,
} from "@/app/(dashboard)/dashboard/task/_constant";

export function useCalendarData(dateRange: { start: string; end: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: isTasksLoading } = useTaskQuery(
    dateRange.start,
    dateRange.end,
  );
  const { data: appointments = [], isLoading: isAppointmentsLoading } =
    useAppointmentQuery(dateRange.start, dateRange.end);
  const { data: holidays = [], isLoading: isHolidaysLoading } = useGetHolidays(
    session?.user?.companyId ?? 0,
  );
  const invalidateCalendarQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [taskQueryKey.allTasks] });
    queryClient.invalidateQueries({
      queryKey: [appointmentQueryKey.allAppointments],
    });
    queryClient.invalidateQueries({ queryKey: taskQueryKey.allTaskByScroll });
  }, [queryClient]);

  return {
    tasks,
    appointments,
    holidays,
    isLoading: isTasksLoading || isAppointmentsLoading || isHolidaysLoading,
    invalidateCalendarQueries,
  };
}

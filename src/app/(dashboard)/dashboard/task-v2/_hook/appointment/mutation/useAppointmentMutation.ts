import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";
import { appointmentQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { useDate } from "@/app/(dashboard)/dashboard/task/_hook/lib/useDate";
import useWeekStartEndDays from "@/app/(dashboard)/dashboard/task/_hook/lib/useWeekStartEndDays";
import { Appointment } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

export default function useAppointmentMutation() {
  const queryClient = useQueryClient();
  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");
  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const pathname = usePathname();
  const isDayPage = pathname === "/dashboard/task/day";
  const isWeekPage = pathname === "/dashboard/task/week";
  return useMutation({
    mutationFn: async (updatedAppointment: {
      id: number;
      date: Date | string;
      startTime: string;
      endTime: string;
      timezone: string;
    }) => {
      const response = await assignAppointmentDate({
        ...updatedAppointment,
      });
      return response.data as Appointment;
    },

    // Optimistic update — immediately reflect the change in the UI
    onMutate: async (newAppointment) => {
      await queryClient.cancelQueries({
        queryKey: [appointmentQueryKey.allAppointments, dateFormat],
      });

      await queryClient.cancelQueries({
        queryKey: [
          appointmentQueryKey.allAppointments,
          weekStartDate,
          weekEndDate,
        ],
      });

      const applyUpdate = (appointment: Appointment) =>
        appointment.id === newAppointment.id
          ? { ...appointment, ...newAppointment }
          : appointment;

      let previousTodos: Appointment[] = [];

      if (isDayPage) {
        previousTodos = queryClient.getQueryData([
          appointmentQueryKey.allAppointments,
          dateFormat,
        ]) as Appointment[];
      } else if (isWeekPage) {
        previousTodos = queryClient.getQueryData([
          appointmentQueryKey.allAppointments,
          weekStartDate,
          weekEndDate,
        ]) as Appointment[];
      }

      queryClient.setQueryData(
        [appointmentQueryKey.allAppointments, dateFormat],
        (oldData: Appointment[]) => {
          if (!oldData || oldData.length === 0) return oldData ?? [];
          return oldData.map(applyUpdate);
        },
      );

      queryClient.setQueryData(
        [appointmentQueryKey.allAppointments, weekStartDate, weekEndDate],
        (oldData: Appointment[]) => {
          if (!oldData || oldData.length === 0) return oldData ?? [];
          return oldData.map(applyUpdate);
        },
      );

      return { previousTodos };
    },

    // Update cache with actual server data — avoids the refetch flicker
    onSuccess: (data) => {
      if (!data) return;

      const applyServerData = (appointment: Appointment) =>
        appointment.id === data.id ? data : appointment;

      queryClient.setQueryData(
        [appointmentQueryKey.allAppointments, dateFormat],
        (oldData: Appointment[]) => {
          if (!oldData) return oldData;
          return oldData.map(applyServerData);
        },
      );

      queryClient.setQueryData(
        [appointmentQueryKey.allAppointments, weekStartDate, weekEndDate],
        (oldData: Appointment[]) => {
          if (!oldData) return oldData;
          return oldData.map(applyServerData);
        },
      );
    },

    // Rollback on error
    onError: (err, newTodo, context) => {
      console.error("Error updating appointment:", err);
      if (isDayPage) {
        queryClient.setQueryData(
          [appointmentQueryKey.allAppointments, dateFormat],
          context?.previousTodos,
        );
      } else if (isWeekPage) {
        queryClient.setQueryData(
          [appointmentQueryKey.allAppointments, weekStartDate, weekEndDate],
          context?.previousTodos,
        );
      }
    },
  });
}

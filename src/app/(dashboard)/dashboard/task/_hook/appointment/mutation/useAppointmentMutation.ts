import { assignAppointmentDate } from "@/actions/appointment/assignAppointmentDate";
import { Appointment } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentQueryKey } from "../../../_constant";
import { useDate } from "../../lib/useDate";
import useWeekStartEndDays from "../../lib/useWeekStartEndDays";
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

    // 🔁 Optimistic update
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
      // update day page appointments
      queryClient.setQueryData(
        [appointmentQueryKey.allAppointments, dateFormat],
        (oldTaskData: Appointment[]) => {
          const updatedData =
            oldTaskData && oldTaskData.length > 0
              ? oldTaskData.map((appointment: Appointment) =>
                  appointment.id === newAppointment.id
                    ? { ...appointment, ...newAppointment }
                    : appointment,
                )
              : [];
          return updatedData;
        },
      );

      // update week page appointments
      queryClient.setQueryData(
        [appointmentQueryKey.allAppointments, weekStartDate, weekEndDate],
        (oldTaskData: Appointment[]) => {
          const updatedData =
            oldTaskData && oldTaskData.length > 0
              ? oldTaskData.map((appointment: Appointment) =>
                  appointment.id === newAppointment.id
                    ? { ...appointment, ...newAppointment }
                    : appointment,
                )
              : [];
          return updatedData;
        },
      );

      return { previousTodos };
    },

    // ❌ Rollback on error
    onError: (err, newTodo, context) => {
      console.error("Error updating appointment:", err);
      console.log("context", context);
      // Rollback day page appointments
      if (isDayPage) {
        queryClient.setQueryData(
          [appointmentQueryKey.allAppointments, dateFormat],
          context?.previousTodos,
        );
      } else if (isWeekPage) {
        // Rollback week page appointments
        queryClient.setQueryData(
          [appointmentQueryKey.allAppointments, weekStartDate, weekEndDate],
          context?.previousTodos,
        );
      }
    },

    // ✅ Refetch after success or error
    onSettled: () => {
      // Invalidate day page appointments
      queryClient.invalidateQueries({
        queryKey: [appointmentQueryKey.allAppointments, dateFormat],
      });

      // Invalidate week page appointments
      queryClient.invalidateQueries({
        queryKey: [
          appointmentQueryKey.allAppointments,
          weekStartDate,
          weekEndDate,
        ],
      });
    },
  });
}

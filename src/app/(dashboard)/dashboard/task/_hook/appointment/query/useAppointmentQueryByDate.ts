import { useQuery } from "@tanstack/react-query";
import { appointmentQueryKey } from "../../../_constant";
import getAppointments from "@/actions/task/getAppointments";
import { Appointment, AppointmentUser, User } from "@prisma/client";

export default function useAppointmentQueryByDate(date: string) {
  return useQuery({
    queryKey: [appointmentQueryKey.allAppointments, date],
    queryFn: async () => {
      const response = await getAppointments({
        where: {
          date: `${date}T00:00:00.000Z`,
          AND: [{ startTime: { not: null } }, { endTime: { not: null } }],
        },
        include: {
          appointmentUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              mobile: true,
            },
          },
        },
      });
      return response.data as (Appointment & {
        appointmentUsers: (AppointmentUser & { user: User })[];
      })[];
    },
  });
}

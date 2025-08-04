import { useQuery } from "@tanstack/react-query";
import { appointmentQueryKey } from "../../../_constant";
import getAppointments from "@/actions/task/getAppointments";
import { Appointment, AppointmentUser, User } from "@prisma/client";

export default function useAppointmentQueryByWeek(
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: [appointmentQueryKey.allAppointments, startDate, endDate],
    queryFn: async () => {
      const response = await getAppointments({
        where: {
          date: {
            gte: `${startDate}T00:00:00.000Z`,
            lte: `${endDate}T00:00:00.000Z`,
          },
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

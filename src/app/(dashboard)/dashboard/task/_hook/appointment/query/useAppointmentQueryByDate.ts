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
          AND: [
            { startTime: { not: null } },
            { endTime: { not: null } },
            { date: { lte: `${date}T23:59:59.999Z` } },
            {
              OR: [
                { endDate: null, date: `${date}T00:00:00.000Z` },
                { endDate: { gte: `${date}T00:00:00.000Z` } },
              ],
            },
          ],
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

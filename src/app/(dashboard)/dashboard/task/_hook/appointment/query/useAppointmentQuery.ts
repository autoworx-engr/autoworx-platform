import getAppointments from "@/actions/task/getAppointments";
import { Appointment, AppointmentUser, User } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { appointmentQueryKey } from "../../../_constant";

export default function useAppointmentQuery(
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
            lte: `${endDate}T23:59:59.999Z`,
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
          vehicle: {
            select: {
              model: true,
              make: true,
              year: true,
            },
          },
        },
      });
      const appointments = response.data as (Appointment & {
        appointmentUsers: (AppointmentUser & { user: User })[];
      })[];

      // Transform appointmentUsers to assignedUsers to match CalendarAppointment interface
      return appointments.map((appointment) => {
        const { appointmentUsers, ...appointmentData } = appointment;
        return {
          ...appointmentData,
          assignedUsers: appointmentUsers.map(
            (appointmentUser) => appointmentUser.user,
          ),
        };
      });
    },
  });
}

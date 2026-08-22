import getAppointments from "@/actions/task/getAppointments";
import { Appointment } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { appointmentQueryKey } from "../../../_constant";

export type CalendarAppointmentUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
};

export type CalendarAppointment = Omit<Appointment, never> & {
  assignedUsers: CalendarAppointmentUser[];
  client: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    mobile: string | null;
  } | null;
  vehicle: {
    model: string | null;
    make: string | null;
    year: number | null;
  } | null;
  serviceCategory: {
    id: number;
    name: string;
    color: string | null;
  } | null;
};

export default function useAppointmentQuery(
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: [appointmentQueryKey.allAppointments, startDate, endDate],
    queryFn: async () => {
      const response = await getAppointments({
        where: {
          AND: [
            { date: { lte: `${endDate}T23:59:59.999Z` } },
            {
              OR: [
                { endDate: null, date: { gte: `${startDate}T00:00:00.000Z` } },
                { endDate: { gte: `${startDate}T00:00:00.000Z` } },
              ],
            },
            {
              OR: [
                {
                  AND: [
                    { startTime: { not: null } },
                    { endTime: { not: null } },
                  ],
                },
                { AND: [{ startTime: null }, { endTime: null }] },
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
          vehicle: {
            select: {
              model: true,
              make: true,
              year: true,
            },
          },
          serviceCategory: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
      const raw = response.data as (Appointment & {
        appointmentUsers: { user: CalendarAppointmentUser }[];
        client: CalendarAppointment["client"];
        vehicle: CalendarAppointment["vehicle"];
        serviceCategory: CalendarAppointment["serviceCategory"];
      })[];

      return raw.map(
        ({ appointmentUsers, ...appointmentData }): CalendarAppointment => ({
          ...appointmentData,
          assignedUsers: appointmentUsers.map((au) => au.user),
        }),
      );
    },
  });
}

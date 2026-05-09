import getAppointments from "@/actions/task/getAppointments";
import { Appointment, AppointmentUser, User } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { appointmentQueryKey } from "../../../_constant";

export default function useAppointmentQueryByMonth(
  month: string,
  year: number,
) {
  const monthNumber = moment(month, "MMMM").month() + 1;
  const startDate = moment(`${year}-${monthNumber}-01`)
    .startOf("month")
    .format("YYYY-MM-DD");
  const endDate = moment(`${year}-${monthNumber}-01`)
    .endOf("month")
    .format("YYYY-MM-DD");
  return useQuery({
    queryKey: [appointmentQueryKey.allAppointments, month, year],
    queryFn: async () => {
      const response = await getAppointments({
        where: {
          AND: [
            { startTime: { not: null } },
            { endTime: { not: null } },
            { date: { lte: `${endDate}T23:59:59.999Z` } },
            {
              OR: [
                { endDate: null, date: { gte: `${startDate}T00:00:00.000Z` } },
                { endDate: { gte: `${startDate}T00:00:00.000Z` } },
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

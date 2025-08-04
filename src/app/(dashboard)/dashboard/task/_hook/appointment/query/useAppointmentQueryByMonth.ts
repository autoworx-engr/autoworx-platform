import { useQuery } from "@tanstack/react-query";
import { appointmentQueryKey } from "../../../_constant";
import getAppointments from "@/actions/task/getAppointments";
import { Appointment, AppointmentUser, User } from "@prisma/client";
import moment from "moment";

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

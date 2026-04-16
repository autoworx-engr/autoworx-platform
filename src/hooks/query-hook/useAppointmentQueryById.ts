import getAppointmentById from "@/actions/task/getAppointmentById";
import { queryKeys } from "@/lib/queryKeys";
import {
  Appointment,
  Client,
  EmailTemplate,
  User,
  Vehicle,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

type TAppointmentDataResponse = Appointment & {
  client: Partial<Client> & {
    Lead: { id: number; companyId: number; columnId: number };
  };
  vehicle: Partial<Vehicle>;
  appointmentUsers: {
    user: User;
  }[];
  confirmationEmailTemplate: EmailTemplate | null;
  reminderEmailTemplate: EmailTemplate | null;
};

export default function useAppointmentQueryById(
  appointmentId: number,
  options: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.appointmentById(appointmentId),
    queryFn: async () => {
      if (!appointmentId) {
        return null;
      }
      const appointment = (await getAppointmentById(appointmentId, {
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              Lead: {
                select: {
                  id: true,
                  companyId: true,
                  columnId: true,
                },
              },
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              other: true,
            },
          },
          appointmentUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  employeeType: true,
                  image: true,
                },
              },
            },
          },
        },
      })) as TAppointmentDataResponse;
      const { appointmentUsers, ...rest } = appointment;
      return {
        ...rest,
        assignUsers: appointment.appointmentUsers.map(
          (appointmentUser) => appointmentUser.user,
        ),
      };
    },
    enabled: options.enabled,
  });
}

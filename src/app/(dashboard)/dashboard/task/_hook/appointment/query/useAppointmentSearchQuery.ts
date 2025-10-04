import { useQuery } from "@tanstack/react-query";
import getAppointments from "@/actions/task/getAppointments";
import { appointmentQueryKey } from "../../../_constant";
import { Appointment } from "@prisma/client";

export default function useAppointmentSearchQuery(searchTerm: string = "") {
  return useQuery({
    queryKey: [appointmentQueryKey.allAppointments, searchTerm],
    queryFn: async () => {
      const response = await getAppointments({
        where: {
          OR: [
            {
              title: { contains: searchTerm, mode: "insensitive" },
            },
            {
              client: {
                firstName: { contains: searchTerm, mode: "insensitive" },
              },
            },
            {
              client: {
                lastName: { contains: searchTerm, mode: "insensitive" },
              },
            },
            {
              vehicle: {
                make: { contains: searchTerm, mode: "insensitive" },
              },
            },
            {
              vehicle: {
                model: { contains: searchTerm, mode: "insensitive" },
              },
            },
            ...(isNaN(Number(searchTerm))
              ? []
              : [
                  {
                    vehicle: {
                      year: { equals: parseInt(searchTerm, 10) },
                    },
                  },
                ]),
          ],
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
            },
          },
        },
      });
      return response.data as (Appointment & {
        client: { id: number; firstName: string; lastName: string } | null;
        vehicle: {
          id: number;
          make: string;
          model: string;
          year: string;
        } | null;
      })[];
    },
    enabled: !!searchTerm.trim(),
  });
}

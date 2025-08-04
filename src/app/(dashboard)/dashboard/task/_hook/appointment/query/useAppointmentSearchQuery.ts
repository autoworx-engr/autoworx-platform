import { useQuery } from "@tanstack/react-query";
import getAppointments from "@/actions/task/getAppointments";
import { appointmentQueryKey } from "../../../_constant";

export default function useAppointmentSearchQuery(searchTerm: string = "") {
  return useQuery({
    queryKey: [appointmentQueryKey.allAppointments, searchTerm],
    queryFn: async () => {
      const response = await getAppointments({
        where: {
          OR: [
            {
              title: { contains: searchTerm },
            },
          ],
        },
      });
      return response.data;
    },
    enabled: !!searchTerm.trim(),
  });
}

import { useInfiniteQuery } from "@tanstack/react-query";
import getAppointments from "@/actions/task/getAppointments";
import { appointmentQueryKey } from "../../../_constant";
import { Appointment } from "@prisma/client";

export const APPOINTMENT_SEARCH_PAGE_SIZE = 10;

export type AppointmentSearchItem = Appointment & {
  client: { id: number; firstName: string; lastName: string } | null;
  vehicle: { id: number; make: string; model: string; year: string } | null;
};

/**
 * Server-paginated appointment search. Fetches one page at a time (skip/take)
 * so the calendar search dropdown can infinite-scroll against the server.
 */
export default function useAppointmentSearchQuery(searchTerm: string = "") {
  // Surrounding whitespace must never reach the `contains` filters — " test"
  // matches nothing in the DB even when "test" does.
  const term = searchTerm.trim();

  return useInfiniteQuery({
    queryKey: [appointmentQueryKey.allAppointments, "search", term],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const response = await getAppointments({
        where: {
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            {
              client: {
                firstName: { contains: term, mode: "insensitive" },
              },
            },
            {
              client: {
                lastName: { contains: term, mode: "insensitive" },
              },
            },
            {
              vehicle: { make: { contains: term, mode: "insensitive" } },
            },
            {
              vehicle: { model: { contains: term, mode: "insensitive" } },
            },
            ...(term && !isNaN(Number(term))
              ? [{ vehicle: { year: { equals: parseInt(term, 10) } } }]
              : []),
          ],
        },
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          vehicle: {
            select: { id: true, make: true, model: true, year: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pageParam,
        take: APPOINTMENT_SEARCH_PAGE_SIZE,
      });
      return {
        items: response.data as AppointmentSearchItem[],
        total: response.totalAppointments ?? 0,
        skip: pageParam,
      };
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.skip + lastPage.items.length;
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!term,
  });
}

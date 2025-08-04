import getAppointments from "@/actions/task/getAppointments";
import { useInfiniteQuery } from "@tanstack/react-query";
import { appointmentQueryKey } from "../../../_constant";

const defaultTake = 20;
const fetchAppointments = async ({ pageParam = 1 }) => {
  const { data: appointments, totalAppointments } = await getAppointments({
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
    orderBy: { createdAt: "desc" },
    take: defaultTake,
    skip: (pageParam - 1) * defaultTake,
  });

  const hasMore = defaultTake * pageParam < totalAppointments;
  return {
    data: appointments,
    total: totalAppointments,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore: hasMore,
  };
};

export default function useInfinityAppointmentQuery() {
  return useInfiniteQuery({
    queryKey: appointmentQueryKey.allAppointmentsByScroll,
    queryFn: fetchAppointments,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  });
}

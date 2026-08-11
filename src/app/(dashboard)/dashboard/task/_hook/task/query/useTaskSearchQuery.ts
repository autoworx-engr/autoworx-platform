import getTasks from "@/actions/task/getTasks";
import { useInfiniteQuery } from "@tanstack/react-query";
import { taskQueryKey } from "../../../_constant";
import { clientNameFilter } from "../../../_utils/clientNameSearch";
import { Task } from "@prisma/client";

export const TASK_SEARCH_PAGE_SIZE = 10;

export type TaskSearchItem = Task & {
  client: { id: number; firstName: string; lastName: string } | null;
  Invoice: {
    vehicle: { id: number; make: string; model: string; year: string } | null;
  } | null;
};

/**
 * Server-paginated task search. Fetches one page at a time (skip/take) and
 * exposes fetchNextPage so the calendar search dropdown can infinite-scroll
 * against the server rather than slicing a fully-loaded list client-side.
 */
export default function useTaskSearchQuery(searchTerm: string) {
  // Surrounding whitespace must never reach the `contains` filter — " test"
  // matches nothing in the DB even when "test" does.
  const term = searchTerm.trim();
  const nameFilter = clientNameFilter(term);

  return useInfiniteQuery({
    queryKey: [taskQueryKey.allTasks, "search", term],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const response = await getTasks({
        where: {
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            ...(nameFilter ? [{ client: nameFilter }] : []),
          ],
        },
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          Invoice: { select: { vehicle: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pageParam,
        take: TASK_SEARCH_PAGE_SIZE,
      });
      return {
        items: response.data as TaskSearchItem[],
        total: response.totalTask ?? 0,
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

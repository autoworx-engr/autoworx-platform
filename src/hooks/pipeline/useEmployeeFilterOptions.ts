import { getEmployeeFilterOptions } from "@/actions/pipelines/getEmployeeFilterOptions";
import { EmployeeType } from "@prisma/client";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 20;

export function useEmployeeFilterOptions(
  employeeType: EmployeeType | undefined,
  search: string,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: ["employee-filter-options", employeeType ?? null, search],
    queryFn: ({ pageParam }) =>
      getEmployeeFilterOptions(
        pageParam * PAGE_SIZE,
        PAGE_SIZE,
        employeeType,
        search || undefined,
      ),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
    initialPageParam: 0,
    // Only fires once the panel is actually opened
    enabled,
  });
}

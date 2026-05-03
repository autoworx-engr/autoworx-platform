import { getEmployeesForPaginate } from "@/actions/employee/get";
import { getCompanyId } from "@/lib/companyId";
import { EmployeeType } from "@prisma/client";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

export const EMPLOYEE_LIST_KEY = "employees";

type TEmployeeQueryParam = {
  type: EmployeeType | "All";
  searchTerm: string;
  dateRange: {
    startDate?: Date | null;
    endDate?: Date | null;
  };
  currentPage?: number;
  pageSize?: number;
  enabled?: boolean;
};

export default function useEmployeeQuery({
  currentPage,
  pageSize,
  dateRange,
  searchTerm,
  type,
  enabled = true,
}: TEmployeeQueryParam) {
  return useQuery({
    queryKey: [
      EMPLOYEE_LIST_KEY,
      currentPage,
      pageSize,
      type,
      searchTerm,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async () => {
      const companyId = await getCompanyId();
      const response = await getEmployeesForPaginate({
        companyId,
        page: currentPage ?? 1,
        take: pageSize ?? 50,
        filter: {
          type: type === "All" ? undefined : type,
          searchParams: searchTerm || undefined,
          dateRange:
            dateRange?.startDate && dateRange?.endDate
              ? {
                  startDate: format(dateRange.startDate, "yyyy-MM-dd"),
                  endDate: format(dateRange.endDate, "yyyy-MM-dd"),
                }
              : undefined,
        },
      });
      const { employees, totalEmployees } = response || {};
      return { employees, totalEmployees };
    },
    enabled,
  });
}

import { getCompanyUser } from "@/actions/user/getCompanyUser";
import { userQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { EmployeeType } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

export default function useEmployeeQuery(
  type: EmployeeType,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [userQueryKey.employees, type],
    queryFn: async () => {
      return getCompanyUser({
        where: {
          employeeType: type,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true,
          role: true,
          employeeType: true,
          email: true,
        },
      });
    },
    enabled: options?.enabled,
  });
}

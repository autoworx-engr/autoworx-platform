import { getCompanyUser } from "@/actions/user/getCompanyUser";
import { userQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { useQuery } from "@tanstack/react-query";

export default function useCompanyUsersQuery() {
  return useQuery({
    queryKey: [userQueryKey.companyUsers],
    queryFn: async () => {
      return getCompanyUser({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true,
        },
      });
    },
  });
}

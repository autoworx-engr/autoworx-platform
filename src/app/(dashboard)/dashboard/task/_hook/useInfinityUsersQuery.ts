import getUsersForAdminOrManager from "@/actions/task/getUsersForAdminOrManager";
import { useInfiniteQuery } from "@tanstack/react-query";
import { userQueryKey } from "../_constant";

const defaultTake = 20;
const fetchUsers = async ({ pageParam = 1, searchTerm = "" }) => {
  const { data: tasks, totalUsers } = await getUsersForAdminOrManager(
    searchTerm,
    {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        image: true,
      },
      orderBy: { createdAt: "desc" },
      take: defaultTake,
      skip: (pageParam - 1) * defaultTake,
    },
  );
  const hasMore = defaultTake * pageParam < totalUsers;
  return {
    data: tasks,
    total: totalUsers,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore: hasMore,
  };
};

export default function useInfinityUsersQuery(searchTerm: string) {
  return useInfiniteQuery({
    queryKey: [userQueryKey.users, searchTerm],
    queryFn: ({ pageParam = 1 }) => fetchUsers({ pageParam, searchTerm }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  });
}

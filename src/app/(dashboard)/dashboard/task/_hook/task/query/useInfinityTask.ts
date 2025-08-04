import { useInfiniteQuery } from "@tanstack/react-query";
import { taskQueryKey } from "../../../_constant";
import getTasks from "@/actions/task/getTasks";

const defaultTake = 20;
const fetchTasks = async ({ pageParam = 1 }) => {
  const { data: tasks, totalTask } = await getTasks({
    select: {
      id: true,
      title: true,
      priority: true,
      date: true,
      startTime: true,
      endTime: true,
    },
    orderBy: { createdAt: "desc" },
    take: defaultTake,
    skip: (pageParam - 1) * defaultTake,
  });
  const hasMore = defaultTake * pageParam < totalTask;
  return {
    data: tasks,
    total: totalTask,
    nextPage: hasMore ? pageParam + 1 : undefined,
    hasMore: hasMore,
  };
};

export default function useInfinityTaskQuery() {
  return useInfiniteQuery({
    queryKey: taskQueryKey.allTaskByScroll,
    queryFn: fetchTasks,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
  });
}

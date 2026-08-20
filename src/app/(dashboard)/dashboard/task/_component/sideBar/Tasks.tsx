"use client";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { Task } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { taskQueryKey } from "../../_constant";
import { useDate } from "../../_hook/lib/useDate";
import useWeekStartEndDays from "../../_hook/lib/useWeekStartEndDays";
import useInfinityTaskQuery from "../../_hook/task/query/useInfinityTask";
import TaskError from "../ui/TaskError";
import EmptyMsg from "../../../../../../components/common/EmptyMsg";
import TaskSpinner from "../ui/TaskSpinner";
import { MinimizeButton } from "./MinimizeButton";
import TaskListItem from "@/components/task/TaskListItem";
import TaskListSkeleton from "@/components/ui/TaskListSkeleton";

export default function Tasks() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    amount: 0.5,
    margin: "0px 100px -50px 0px",
  });
  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const date = useDate();
  const dateFormat = date.utc().format("YYYY-MM-DD");
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinityTaskQuery();

  const tasks = data?.pages?.flatMap((page) => page.data) || [];
  const queryClient = useQueryClient();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage]);

  const revalidateTaskQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, dateFormat],
    });

    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
    });

    queryClient.invalidateQueries({
      queryKey: taskQueryKey.allTaskByScroll,
    });
  };

  const handleTaskCreated = () => {
    revalidateTaskQueries();
  };

  const handleTaskRemoved = (taskId: number) => {
    queryClient.setQueryData(
      taskQueryKey.allTaskByScroll,
      (old: { pages?: { data: Task[] }[] } | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: Array.isArray(page.data)
              ? page.data.filter((t) => t.id !== taskId)
              : [],
          })),
        };
      },
    );
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, dateFormat],
    });
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
    });
  };

  let content = null;

  if (isLoading && !isError) {
    // content = <TaskSpinner />;
    content = <TaskListSkeleton rows={11} />;
  } else if (!isLoading && isError) {
    content = <TaskError message="Failed to load task" />;
  } else if (!isLoading && !isError && tasks && tasks?.length === 0) {
    content = <EmptyMsg message={"No Task found"} />;
  } else if (!isLoading && !isError && tasks && tasks?.length > 0) {
    content = (
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            draggable
            onTaskRemoved={handleTaskRemoved}
            onTaskUpdated={revalidateTaskQueries}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="md:app-shadow relative flex h-full min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden rounded-lg p-3 md:max-w-80 md:bg-background">
      <h2 className="flex items-center justify-between">
        <div className="text-base font-semibold text-gray-900 md:text-[16px] md:text-[#797979]">
          Task List
        </div>
        <div className="hidden md:block">
          <MinimizeButton />
        </div>
      </h2>

      <div className="thin-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto md:max-h-full">
        {content}
        <div ref={ref} className="text-center text-sm text-gray-500">
          {isFetchingNextPage ? (
            <TaskSpinner />
          ) : hasNextPage ? (
            "Scroll to load more"
          ) : (
            tasks.length !== 0 && "No more tasks"
          )}
        </div>
      </div>

      <div className="mt-auto w-full">
        <TaskCreateOrEdit onTaskCreated={handleTaskCreated} />
      </div>
    </div>
  );
}

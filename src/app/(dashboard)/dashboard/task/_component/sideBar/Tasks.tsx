"use client";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import { Task } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { taskQueryKey } from "../../_constant";
import { useDate } from "../../_hook/lib/useDate";
import useWeekStartEndDays from "../../_hook/lib/useWeekStartEndDays";
import useInfinityTaskQuery from "../../_hook/task/query/useInfinityTask";
import TaskError from "../ui/TaskError";
import TaskNotFound from "../ui/TaskNotFound";
import TaskSpinner from "../ui/TaskSpinner";
import { MinimizeButton } from "./MinimizeButton";
import TaskComponent from "./Task";
import TaskListSkeleton from "@/components/ui/TaskListSkeleton";

export default function Tasks() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    amount: 0.5,
    margin: "0px 100px -50px 0px",
  });
  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");
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
  const minimized = useCalendarSidebarStore((x) => x.minimized);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage]);

  let content = null;

  if (isLoading && !isError) {
    // content = <TaskSpinner />;
    content = <TaskListSkeleton rows={11} />;
  } else if (!isLoading && isError) {
    content = <TaskError message="Failed to load task" />;
  } else if (!isLoading && !isError && tasks && tasks?.length === 0) {
    content = <TaskNotFound message={"No Task found"} />;
  } else if (!isLoading && !isError && tasks && tasks?.length > 0) {
    content = tasks.map((task) => <TaskComponent key={task.id} task={task} />);
  }

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
  return (
    <div
      className={cn(
        "md:app-shadow relative mt-5 flex flex-grow flex-col gap-2 overflow-hidden rounded-[12px] md:bg-background",
        minimized || "p-3"
      )}
    >
      <h2 className="-mt-4 flex items-center justify-between md:-mt-0">
        {!minimized && (
          <div className=" text-base font-semibold text-gray-900 md:text-[16px] md:text-[#797979]">
            Task List
          </div>
        )}
        <div className="hidden md:block">
          <MinimizeButton />
        </div>
      </h2>

      {!minimized && (
        <div className="thin-scrollbar max-h-[500px] space-y-2 overflow-y-auto md:max-h-full">
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
      )}

      {!minimized && (
        <div className="mt-auto w-full">
          <TaskCreateOrEdit onTaskCreated={handleTaskCreated} />
        </div>
      )}
    </div>
  );
}

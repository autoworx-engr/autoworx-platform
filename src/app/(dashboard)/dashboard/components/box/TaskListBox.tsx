"use client";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import useTasksQueryForDashboard from "@/hooks/query-hook/useTasksQueryForDashboard";
import { FaPlus } from "react-icons/fa";
import BoxTitle from "./BoxTitle";
import Task from "./Task";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

export default function TaskListBox() {
  const { data: tasks, isLoading, isError } = useTasksQueryForDashboard();

  const queryClient = useQueryClient();

  let content = null;

  if (isLoading && !isError) {
    content = <div className="text-center text-gray-500">Loading tasks...</div>;
  } else if (!isLoading && isError) {
    content = (
      <div className="text-center text-red-500">Error loading tasks</div>
    );
  } else if (!isLoading && !isError && tasks && tasks.length === 0) {
    content = (
      <div className="flex flex-1 items-center justify-center self-center text-center">
        <span className="text-sm text-gray-500">
          You have no upcoming tasks
        </span>
      </div>
    );
  } else if (!isLoading && !isError && tasks && tasks.length > 0) {
    content = tasks.map((task, idx) => <Task key={idx} task={task} />);
  }

  const revalidateTask = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboardTask,
    });
  };
  return (
    <div className="flex-1 overflow-y-auto shadow-md">
      <div
        className={`flex h-full flex-col overflow-y-auto rounded-md p-4 shadow-lg md:p-6`}
      >
        <BoxTitle title="Task List" redirectLink="/dashboard/task/day" />
        <div className="thin-scrollbar my-2 flex max-h-64 flex-1 flex-col space-y-2 overflow-x-hidden lg:max-h-full">
          {content}
        </div>
        <div className="mt-auto flex w-full justify-center md:w-20 md:justify-start">
          {/* <NewTask companyUsers={companyUsers} /> */}
          <TaskCreateOrEdit
            triggerIcon={
              <button className="flex w-full min-w-32 items-center justify-center gap-1 rounded-md bg-blue-600 px-2 py-2 text-[15px] text-white max-[1300px]:py-1">
                <FaPlus className="" />
                <span className="block">Add Task</span>
              </button>
            }
            onTaskCreated={revalidateTask}
          />
        </div>
      </div>
    </div>
  );
}

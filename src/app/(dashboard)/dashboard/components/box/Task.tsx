"use client";
import { deleteTask } from "@/actions/task/deleteTask";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/queryKeys";
import { successToast } from "@/lib/toast";
import { useCalendarStore } from "@/stores/calendarStore";
import { Task as TaskType } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip } from "antd";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaRegCheckCircle } from "react-icons/fa";
import { MdOutlineEdit } from "react-icons/md";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useDate } from "../../task/_hook/lib/useDate";

type TaskProps = {
  task: TaskType;
};

const Task = ({ task }: TaskProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { setNavigating, setDate } = useCalendarStore();
  const queryClient = useQueryClient();
  const timezone = useCompanyTimezone();
  const queryDate = useDate();

  const handleTaskClick = () => {
    // const dateString = moment.utc(task?.date).tz(timezone).format("YYYY-MM-DD");
    const dateString = task?.date
      ? task.date instanceof Date
        ? task.date.toLocaleDateString("en-CA") // 'YYYY-MM-DD' format
        : moment(task.date).format("YYYY-MM-DD")
      : queryDate.format("YYYY-MM-DD");

    // Set navigation flag to prevent reset, then set date and navigate
    setNavigating(true);
    setDate(dateString);
    router.push("/dashboard/task/day");
  };

  const revalidateTask = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboardTask,
    });
  };

  return (
    <>
      <TaskCreateOrEdit
        fromEdit
        taskId={task.id}
        onTaskUpdated={revalidateTask}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      />
      <div
        className={cn(
          "flex cursor-pointer items-center justify-between gap-x-2 rounded px-2 py-2 text-sm text-white transition-all duration-200 hover:opacity-90 md:gap-x-4 md:px-3",
          {
            "bg-[#6571FF]": task.priority === "Low",
            "bg-[#25AADD]": task.priority === "Medium",
            "bg-[#006d77]": task.priority === "High",
          }
        )}
        onClick={handleTaskClick}
      >
        <div className="min-w-0 flex-1">
          <Tooltip title={task.title}>
            <div className="truncate text-left text-xs md:text-sm">
              {task.title}
            </div>
          </Tooltip>
          <div className="mt-0.5 text-xs opacity-75 md:hidden">
            {moment.utc(task?.date).tz(timezone).format("MMM DD")}
          </div>
        </div>
        <span className="flex flex-shrink-0 items-center gap-x-1 md:gap-x-2">
          <MdOutlineEdit
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="h-4 w-4 cursor-pointer hover:opacity-70 md:h-5 md:w-5"
          />

          <FaRegCheckCircle
            className="h-4 w-4 cursor-pointer hover:opacity-70 md:h-5 md:w-5"
            onClick={async (e) => {
              e.stopPropagation();
              await deleteTask(task.id);
              revalidateTask();
              successToast("Task completed");
            }}
          />
        </span>
      </div>
    </>
  );
};

export default Task;

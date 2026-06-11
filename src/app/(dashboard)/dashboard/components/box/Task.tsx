"use client";
import { completeTask } from "@/actions/task/completeTask";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/queryKeys";
import { successToast, errorToast } from "@/lib/toast";
import { useCalendarStore } from "@/stores/calendarStore";
import { Task as TaskType } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Popconfirm, Tooltip } from "antd";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { useDate } from "../../task/_hook/lib/useDate";
import { CircleCheckBig, SquarePen, Clock } from "lucide-react"; // Import Clock icon
import { taskPriorityStyles } from "@/lib/taskPriorityStyles";

type TaskProps = {
  task: TaskType;
  onTaskDeleted?: (taskId: number) => void;
};

const Task = ({ task, onTaskDeleted }: TaskProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [popconfirmVisible, setPopconfirmVisible] = useState(false);
  const router = useRouter();
  const { setNavigating, setDate } = useCalendarStore();
  const queryClient = useQueryClient();
  const timezone = useCompanyTimezone();
  const queryDate = useDate();

  // Helper function to format date and time in a summarized format
  const getTaskDateTimeSummary = (task: TaskType) => {
    if (!task.date) return null;

    const taskMoment = moment.utc(task.date);
    const timeFormat = task.startTime
      ? moment(task.startTime, "HH:mm").format("h:mmA")
      : null;

    // Format: "MMM DD" or "MMM DD, h:mmA" if time is present
    const datePart = taskMoment.format("MMM DD");

    if (timeFormat) {
      return `${datePart}, ${timeFormat}`;
    }
    return datePart;
  };

  // Get time part only
  const timePart = task.startTime
    ? moment(task.startTime, "HH:mm").format("h:mmA")
    : null;

  // Get date part
  const datePart = task.date ? moment.utc(task.date).format("MMM DD") : null;

  const handleTaskClick = () => {
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

  useEffect(() => {
    const handleScroll = () => {
      if (popconfirmVisible) {
        setPopconfirmVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [popconfirmVisible]);

  const priorityStyle =
    taskPriorityStyles[task.priority as keyof typeof taskPriorityStyles] ||
    taskPriorityStyles.Low;

  return (
    <>
      <TaskCreateOrEdit
        fromEdit
        taskId={task.id}
        onTaskUpdated={revalidateTask}
        onTaskDelete={onTaskDeleted}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      />

      {/* Redesigned Task Item Container */}
      <div
        className={cn(
          `
          flex cursor-pointer items-center justify-between gap-x-2
          rounded-lg py-1.5 md:py-2 px-3 md:px-4 text-sm

          // Core effects: Smooth lift
          transition-all duration-300 ease-in-out
          hover:-translate-y-0.5

          // Enforce compact height
          h-auto min-h-[44px] max-h-[50px]
          `,
        )}
        style={priorityStyle} // Pastel background, left border + text color per priority
        onClick={handleTaskClick}
      >
        {/* Task Title (Primary) */}
        <div className="min-w-0 flex-1">
          <Tooltip title={task.title} placement="topLeft">
            <div className="truncate text-left font-medium text-xs md:text-sm">
              {task.title}
            </div>
          </Tooltip>
          {/* Subtle Date for Mobile (kept, but redundant now with summary) */}
          {/* <div className="mt-0.5 text-xs opacity-80 md:hidden">{datePart}</div> */}
        </div>

        {/* Action Icons & Date/Time Summary */}
        <span className="flex flex-shrink-0 items-center gap-x-2 md:gap-x-3">
          {/* 💡 NEW: Date and Time Summary */}
          {(datePart || timePart) && (
            <Tooltip
              title={
                timePart
                  ? `Due: ${datePart} at ${timePart}`
                  : `Due: ${datePart}`
              }
              placement="top"
            >
              <div className="flex items-center gap-1 text-xs font-semibold opacity-90 transition-opacity hover:opacity-100">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline">
                  {datePart}
                  {timePart && `, ${timePart}`}
                </span>
                <span className="sm:hidden">{timePart || datePart}</span>
              </div>
            </Tooltip>
          )}

          {/* Edit Icon */}
          <SquarePen
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            // Standardized Icon Size and Hover Feedback
            style={{ color: priorityStyle.color }}
            className="h-4 w-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer md:h-5 md:w-5"
          />

          {/* Complete Popconfirm/Icon */}
          <Popconfirm
            title="Complete Task"
            description="Are you sure you want to mark this task as completed?"
            okText="Yes"
            cancelText="No"
            open={popconfirmVisible}
            onOpenChange={setPopconfirmVisible}
            onConfirm={async (e) => {
              e?.stopPropagation();
              const result = await completeTask(task.id);
              if (result.type === "success") {
                successToast("Task completed");
                onTaskDeleted?.(task.id);
              } else {
                errorToast("Failed to complete task. Please try again.");
              }
              setPopconfirmVisible(false);
            }}
            onCancel={(e) => {
              e?.stopPropagation();
              setPopconfirmVisible(false);
            }}
          >
            <CircleCheckBig
              // Standardized Icon Size and Hover Feedback
              style={{ color: priorityStyle.color }}
              className="h-4 w-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer md:h-5 md:w-5"
              onClick={(e) => {
                e.stopPropagation();
                setPopconfirmVisible(true);
              }}
            />
          </Popconfirm>
        </span>
      </div>
    </>
  );
};

export default Task;

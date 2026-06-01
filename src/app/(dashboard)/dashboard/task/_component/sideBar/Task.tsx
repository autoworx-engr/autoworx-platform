import { deleteTask } from "@/actions/task/deleteTask";
import { useCalendarStore } from "@/stores/calendarStore";
import { Task } from "@prisma/client";
import { Popconfirm, Tooltip } from "antd";
import moment from "moment";
import React, { useState, useEffect } from "react";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { errorToast, successToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useDate } from "../../_hook/lib/useDate";
import { taskQueryKey } from "../../_constant";
import useWeekStartEndDays from "../../_hook/lib/useWeekStartEndDays";
import { CircleCheckBig, SquarePen } from "lucide-react";
import { sendTaskCompleteNotification } from "@/lib/notification/task-and-appointment-notify";
import { completeTask } from "@/actions/task/completeTask";

// Colors matching FullCalendar task event colors
const priorityStyles = {
  Low: {
    background: "linear-gradient(to right, #f5f3ff, #ede9fe)",
    borderLeft: "3px solid #6d28d9",
    color: "#6d28d9",
    boxShadow: "0 2px 8px rgba(109, 40, 217, 0.15)",
  },
  Medium: {
    background: "linear-gradient(to right, #f0f9ff, #e0f2fe)",
    borderLeft: "3px solid #0284c7",
    color: "#0284c7",
    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.15)",
  },
  High: {
    background: "linear-gradient(to right, #b2f2bb, #d3f9d8)",
    borderLeft: "3px solid #22a7b8",
    color: "#22a7b8",
    boxShadow: "0 2px 8px rgba(34, 167, 184, 0.15)",
  },
};

type TaskComponentProps = {
  task: Task;
};
export default function TaskComponent({ task }: TaskComponentProps) {
  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const date = useDate();
  const dateFormat = date.utc().format("YYYY-MM-DD");
  const queryClient = useQueryClient();
  const [popconfirmVisible, setPopconfirmVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { setDate, setNavigating, setStartTime } = useCalendarStore();
  // console.log({ taskDate });

  const router = useRouter();

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("text/plain", `task|${task.id}`);
    setIsDragging(true);
  };

  const removeTaskFromScrollCache = (taskId: number) => {
    queryClient.setQueryData(
      taskQueryKey.allTaskByScroll,
      (old: { pages?: { data: Task[] }[] } | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((t) => t.id !== taskId),
          })),
        };
      },
    );
  };

  const handleConfirm = async () => {
    try {
      await completeTask(task.id);
      successToast("Task Completed successfully.");
      removeTaskFromScrollCache(task.id);
      setPopconfirmVisible(false);
    } catch (error) {
      console.error("Failed to delete task:", error);
      errorToast("Failed to delete task. Please try again.");
      setPopconfirmVisible(false);
    }
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

  const handleDragEnd = () => {
    setIsDragging(false);
    setNavigating(false);
  };

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

  const handleUpdate = () => {
    revalidateTaskQueries();
  };

  const handleDeleteTask = (taskId: number) => {
    removeTaskFromScrollCache(taskId);
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, dateFormat],
    });
    queryClient.invalidateQueries({
      queryKey: [taskQueryKey.allTasks, weekStartDate, weekEndDate],
    });
  };

  const priorityStyle =
    priorityStyles[task.priority as keyof typeof priorityStyles] ||
    priorityStyles.Low;

  // Enhance tooltip info with due date/time when available
  const timePart = task.startTime
    ? moment.utc(task.startTime, "HH:mm").format("h:mmA")
    : null;
  const datePart = task.date ? moment.utc(task.date).format("MMM DD") : null;
  const tooltipLabel = datePart
    ? `${task.title} — Due ${datePart}${timePart ? `, ${timePart}` : ""}`
    : task.title;

  return (
    <div
      className={`
        flex items-center gap-x-2 rounded-lg px-3 md:px-4 text-sm
        max-[1300px]:px-2 max-[1300px]:text-[14px]
        transition-all duration-300 ease-in-out
        hover:-translate-y-0.5
        h-auto min-h-[40px] max-h-[56px]  select-none
        ${isDragging ? "opacity-70" : ""}
      `}
      style={{
        ...priorityStyle,
        cursor: task.startTime && task.endTime ? "pointer" : "move",
      }}
      data-task-id={task.startTime && task.endTime ? undefined : task.id}
      data-task-title={task.startTime && task.endTime ? undefined : task.title}
      data-event={
        task.startTime && task.endTime
          ? undefined
          : JSON.stringify({ title: task.title, duration: "01:00:00" })
      }
      draggable={task.startTime && task.endTime ? false : true}
      onDragStart={task.startTime && task.endTime ? undefined : handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => {
        setNavigating(true);
        if (task.date && task.startTime && task.endTime) {
          const redirectDate = moment.utc(task.date).format("YYYY-MM-DD");
          setDate(redirectDate);
          setStartTime(task.startTime);
        }
        router.push("/dashboard/task/day");

        // Clear navigation flag after a short delay to allow navigation to complete
        setTimeout(() => setNavigating(false), 30000);
      }}
    >
      <span
        style={{
          cursor: task.startTime && task.endTime ? "pointer" : "move",
          color: priorityStyle.color,
        }}
        className="w-[90%] text-sm font-semibold leading-tight truncate"
      >
        <Tooltip title={tooltipLabel} placement="right">
          {task.title}
        </Tooltip>
      </span>

      <div className="w-fit flex gap-1 justify-end">
        <TaskCreateOrEdit
          triggerIcon={
            <span onClick={(e) => e.stopPropagation()} className="inline-flex">
              <SquarePen
                style={{ color: priorityStyle.color }}
                className="h-4 w-4 transition-colors cursor-pointer md:h-5 md:w-5 opacity-70 hover:opacity-100"
              />
            </span>
          }
          taskId={task.id}
          fromEdit
          onTaskUpdated={handleUpdate}
          onTaskDelete={handleDeleteTask}
        />

        <Popconfirm
          title="Complete Task"
          description="Are you sure you want to mark this task as completed?"
          okText="Yes"
          cancelText="No"
          open={popconfirmVisible}
          onOpenChange={setPopconfirmVisible}
          onConfirm={(e) => {
            e?.stopPropagation();
            handleConfirm();
          }}
          onCancel={(e) => {
            e?.stopPropagation();
            setPopconfirmVisible(false);
          }}
        >
          <CircleCheckBig
            strokeWidth={2.5}
            style={{ color: priorityStyle.color }}
            className="h-4 w-4 transition-colors cursor-pointer md:h-5 md:w-5 opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setPopconfirmVisible(true);
            }}
          />
        </Popconfirm>
      </div>
    </div>
  );
}

import { deleteTask } from "@/actions/task/deleteTask";
import { useCalendarStore } from "@/stores/calendarStore";
import { Task } from "@prisma/client";
import { Popconfirm, Tooltip } from "antd";
import moment from "moment";
import React, { LegacyRef, useState, useEffect } from "react";
import { useDrag } from "react-dnd";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { errorToast, successToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useDate } from "../../_hook/lib/useDate";
import { taskQueryKey } from "../../_constant";
import useWeekStartEndDays from "../../_hook/lib/useWeekStartEndDays";
import { CircleCheckBig, SquarePen } from "lucide-react";

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
  const dateFormat = date.format("YYYY-MM-DD");
  const queryClient = useQueryClient();
  const [popconfirmVisible, setPopconfirmVisible] = useState(false);
  const [{ isDragging }, drag] = useDrag({
    type: "task",
    item: { type: "task", id: task.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  const queryDate = useDate();
  const {
    setDate,
    date: taskDate,
    setNavigating,
    setStartTime,
  } = useCalendarStore();
  // console.log({ taskDate });

  const router = useRouter();

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("text/plain", `task|${task.id}`);
  };
  const handleDelete = async () => {
    try {
      await deleteTask(task.id);
      successToast("Task Completed successfully.");
      queryClient.invalidateQueries({
        queryKey: taskQueryKey.allTaskByScroll,
      });
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
    const existingDate = queryDate.format("YYYY-MM-DD");
    // Set navigation flag to prevent reset, then set date and navigate
    setNavigating(true);
    setDate(existingDate);
    // router.push("/dashboard/task/day");

    // Clear navigation flag after a short delay to allow navigation to complete
    setTimeout(() => setNavigating(false), 30000);
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
    queryClient.setQueryData([taskQueryKey.allTasks], (oldData: Task[]) => {
      return oldData && oldData.length > 0
        ? oldData.filter((task) => task.id !== taskId)
        : [];
    });
    revalidateTaskQueries();
    successToast("Task deleted successfully.");
  };

  const priorityStyle =
    priorityStyles[task.priority as keyof typeof priorityStyles] ||
    priorityStyles.Low;

  // Enhance tooltip info with due date/time when available
  const timePart = task.startTime
    ? moment(task.startTime, "HH:mm").format("h:mmA")
    : null;
  const datePart = task.date ? moment(task.date).format("MMM DD") : null;
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
        h-auto min-h-[40px] max-h-[56px]
        ${isDragging ? "opacity-70" : ""}
      `}
      style={{
        ...priorityStyle,
        cursor: task.startTime && task.endTime ? "pointer" : "move",
      }}
      ref={
        task.startTime && task.endTime
          ? undefined
          : (drag as unknown as LegacyRef<HTMLDivElement>)
      }
      draggable={task.startTime && task.endTime ? false : true}
      onDragStart={task.startTime && task.endTime ? undefined : handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => {
        setNavigating(true);
        if (task.date && task.startTime && task.endTime) {
          const redirectDate = moment(task.date).format("YYYY-MM-DD");
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
        className="w-[90%] text-sm font-semibold leading-tight"
      >
        <Tooltip title={tooltipLabel} placement="right">
          {task.title.length > 15
            ? task.title.slice(0, 15) + "..."
            : task.title}{" "}
        </Tooltip>
      </span>

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
          handleDelete();
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
  );
}

import { deleteTask } from "@/actions/task/deleteTask";
import { TASK_COLOR } from "@/lib/consts";
import { useCalendarStore } from "@/stores/calendarStore";
import { Task } from "@prisma/client";
import { Popconfirm, Tooltip } from "antd";
import moment from "moment";
import React, { LegacyRef } from "react";
import { useDrag } from "react-dnd";
import { FaRegCheckCircle } from "react-icons/fa";
import { MdOutlineEdit } from "react-icons/md";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { errorToast, successToast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useDate } from "../../../task-v1/[type]/Calendar/Day";
import { taskQueryKey } from "../../_constant";
import useWeekStartEndDays from "../../_hook/lib/useWeekStartEndDays";
import { SquarePen } from "lucide-react";

type TaskComponentProps = {
  task: Task;
};
export default function TaskComponent({ task }: TaskComponentProps) {
  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");
  const queryClient = useQueryClient();
  const [{ isDragging }, drag] = useDrag({
    type: "task",
    item: { type: "task", id: task.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  const queryDate = useDate();
  const { setDate, date: taskDate, setNavigating } = useCalendarStore();
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
    } catch (error) {
      console.error("Failed to delete task:", error);
      errorToast("Failed to delete task. Please try again.");
    }
  };

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
    successToast("Task updated successfully.");
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
  return (
    <div
      className="flex items-center rounded-md px-4 py-2 text-[17px] text-white max-[1300px]:px-2 max-[1300px]:py-1 max-[1300px]:text-[14px]"
      style={{
        backgroundColor: TASK_COLOR[task.priority],
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
    >
      <span
        style={{
          cursor: task.startTime && task.endTime ? "pointer" : "move",
        }}
        className="w-[90%] text-sm"
        onClick={() => {
          // Set navigation flag to prevent reset, then set date and navigate
          setNavigating(true);
          if (task.date && task.startTime && task.endTime) {
            const redirectDate = moment(task.date).format("YYYY-MM-DD");
            console.log("Redirecting to date:", redirectDate);
            setDate(redirectDate);
          }
          router.push("/dashboard/task/day");

          // Clear navigation flag after a short delay to allow navigation to complete
          setTimeout(() => setNavigating(false), 30000);
        }}
      >
        <Tooltip title={task.title} placement="right">
          {task.title.length > 15
            ? task.title.slice(0, 15) + "..."
            : task.title}{" "}
        </Tooltip>
      </span>

      <TaskCreateOrEdit
        triggerIcon={
          <SquarePen className="w-5 h-5 text-[#6571FF] mr-2 cursor-pointer" />
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
        onConfirm={handleDelete}
      >
        <FaRegCheckCircle
          className="text-xl text-white hover:text-gray-400"
          // onClick={handleDelete}
        />
      </Popconfirm>
    </div>
  );
}

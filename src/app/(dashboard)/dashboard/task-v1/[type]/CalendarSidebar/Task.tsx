import { deleteTask } from "@/actions/task/deleteTask";
import { TASK_COLOR } from "@/lib/consts";
import { useCalendarStore } from "@/stores/calendarStore";
import { usePopupStore } from "@/stores/popup";
import { Task, User } from "@prisma/client";
import { Tooltip } from "antd";
import moment from "moment";
import React, { LegacyRef } from "react";
import { useDrag } from "react-dnd";
import { FaRegCheckCircle } from "react-icons/fa";
import { useDate } from "../Calendar/Day";
import { useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";

export default function TaskComponent({
  task,
  companyUsers,
}: {
  task: Task;
  companyUsers: User[];
}) {
  const [{ isDragging }, drag] = useDrag({
    type: "task",
    item: { type: "task", id: task.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  const queryDate = useDate();
  const { open } = usePopupStore();
  const { setDate, setNavigating } = useCalendarStore();

  const router = useRouter();

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("text/plain", `task|${task.id}`);
  };
  const handleDelete = async () => {
    await deleteTask(task.id);
  };

  const existingDate = task?.date
    ? task.date instanceof Date
      ? task.date.toLocaleDateString("en-CA") // 'YYYY-MM-DD' format
      : moment(task.date).format("YYYY-MM-DD")
    : queryDate.format("YYYY-MM-DD");
  const handleDragEnd = () => {
    // Set navigation flag to prevent reset, then set date and navigate
    setNavigating(true);
    setDate(existingDate);
    router.push("/dashboard/task/day");

    // Clear navigation flag after a short delay to allow navigation to complete
    // setTimeout(() => setNavigating(false), 30000);
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
          setDate(existingDate);
          router.push("/dashboard/task/day");

          // Clear navigation flag after a short delay to allow navigation to complete
          // setTimeout(() => setNavigating(false), 30000);
        }}
      >
        <Tooltip title={task.title} placement="right">
          {task.title.length > 15
            ? task.title.slice(0, 15) + "..."
            : task.title}{" "}
        </Tooltip>
      </span>
      <SquarePen
        className="w-5 h-5 text-[#6571FF] mr-2 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          open("UPDATE_TASK", {
            task,
            companyUsers,
          });
        }}
      />
      <FaRegCheckCircle
        className="text-xl text-white hover:text-gray-400"
        onClick={handleDelete}
      />
    </div>
  );
}

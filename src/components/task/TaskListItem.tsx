"use client";
import { completeTask } from "@/actions/task/completeTask";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { cn } from "@/lib/cn";
import { taskPriorityStyles } from "@/lib/taskPriorityStyles";
import { errorToast, successToast } from "@/lib/toast";
import { useCalendarStore } from "@/stores/calendarStore";
import { Task } from "@prisma/client";
import { Popconfirm } from "antd";
import { CircleCheckBig, Clock, PencilLineIcon } from "lucide-react";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TaskListItemProps = {
  task: Task;
  draggable?: boolean;
  onTaskRemoved?: (taskId: number) => void;
  onTaskUpdated?: (task: Task) => void;
  revalidateOnComplete?: boolean;
};

const TaskListItem = ({
  task,
  draggable = false,
  onTaskRemoved,
  onTaskUpdated,
  revalidateOnComplete = false,
}: TaskListItemProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [popconfirmVisible, setPopconfirmVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const { setNavigating, setDate, setStartTime } = useCalendarStore();

  // A task is only draggable onto the calendar if it has no fixed time slot yet.
  const isSchedulable = Boolean(task.startTime && task.endTime);
  const canDrag = draggable && !isSchedulable;

  const timePart = task.startTime
    ? moment.utc(task.startTime, "HH:mm").format("h:mmA")
    : null;
  const datePart = task.date ? moment.utc(task.date).format("MMM DD") : null;

  useEffect(() => {
    const handleScroll = () => {
      if (popconfirmVisible) setPopconfirmVisible(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [popconfirmVisible]);

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("text/plain", `task|${task.id}`);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setNavigating(false);
  };

  const handleClick = () => {
    setNavigating(true);
    if (task.date) {
      setDate(moment.utc(task.date).format("YYYY-MM-DD"));
      if (isSchedulable && task.startTime) setStartTime(task.startTime);
    }
    router.push("/dashboard/task/day");
    setTimeout(() => setNavigating(false), 30000);
  };

  const handleComplete = async () => {
    const result = await completeTask(
      task.id,
      revalidateOnComplete ? undefined : { revalidate: false },
    );
    if (result.type === "success") {
      successToast("Task Completed successfully.");
      onTaskRemoved?.(task.id);
    } else {
      errorToast("Failed to complete task. Please try again.");
    }
    setPopconfirmVisible(false);
  };

  const priorityStyle =
    taskPriorityStyles[task.priority as keyof typeof taskPriorityStyles] ||
    taskPriorityStyles.Low;

  return (
    <div
      className={cn(
        `flex cursor-pointer items-center justify-between gap-x-2
         rounded-lg py-1.5 md:py-2 px-3 md:px-4 text-sm
         transition-all duration-300 ease-in-out h-auto min-h-[44px] max-h-[64px] select-none`,
        isDragging && "opacity-70",
      )}
      style={{ ...priorityStyle, cursor: canDrag ? "move" : "pointer" }}
      data-task-id={canDrag ? task.id : undefined}
      data-task-title={canDrag ? task.title : undefined}
      data-event={
        canDrag
          ? JSON.stringify({ title: task.title, duration: "01:00:00" })
          : undefined
      }
      draggable={canDrag}
      onDragStart={canDrag ? handleDragStart : undefined}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      {/* Task Title + Date/Time */}
      <div className="min-w-0 flex-1">
        <div
          style={{ color: priorityStyle.color }}
          className="truncate text-left text-xs font-semibold leading-tight md:text-sm"
        >
          {task.title}
        </div>

        {(datePart || timePart) && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium opacity-80 transition-opacity hover:opacity-100">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>
              {datePart}
              {timePart && `, ${timePart}`}
            </span>
          </div>
        )}
      </div>

      {/* Action icons */}
      <span className="flex flex-shrink-0 items-center gap-x-2 md:gap-x-3">
        {/* Edit */}
        <TaskCreateOrEdit
          triggerIcon={
            <span onClick={(e) => e.stopPropagation()} className="inline-flex">
              <PencilLineIcon
                style={{ color: priorityStyle.color }}
                className="h-4 w-4 cursor-pointer opacity-70 transition-opacity hover:opacity-100 md:h-5 md:w-5"
              />
            </span>
          }
          taskId={task.id}
          fromEdit
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          revalidateOnDelete={false}
          onTaskUpdated={onTaskUpdated}
          onTaskDelete={onTaskRemoved}
        />

        {/* Complete */}
        <Popconfirm
          title="Complete Task"
          description="Are you sure you want to mark this task as completed?"
          okText="Yes"
          cancelText="No"
          open={popconfirmVisible}
          onOpenChange={setPopconfirmVisible}
          onConfirm={(e) => {
            e?.stopPropagation();
            handleComplete();
          }}
          onCancel={(e) => {
            e?.stopPropagation();
            setPopconfirmVisible(false);
          }}
        >
          <CircleCheckBig
            strokeWidth={2.5}
            style={{ color: priorityStyle.color }}
            className="h-4 w-4 cursor-pointer opacity-70 transition-opacity hover:opacity-100 md:h-5 md:w-5"
            onClick={(e) => {
              e.stopPropagation();
              setPopconfirmVisible(true);
            }}
          />
        </Popconfirm>
      </span>
    </div>
  );
};

export default TaskListItem;

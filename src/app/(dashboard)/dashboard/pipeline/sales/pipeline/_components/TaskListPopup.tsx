import { taskPriorityStyles } from "@/lib/taskPriorityStyles";
import { Task } from "@prisma/client";
import React from "react";

type TTaskListPopupProps = {
  tasks: Task[];
  onTaskClick: (taskId: number) => void;
  isTechnician?: boolean;
  zIndexClass?: string;
};

export default function TaskListPopup({
  tasks,
  onTaskClick,
  isTechnician = false,
  zIndexClass = "z-[10]",
}: TTaskListPopupProps) {
  return (
    <div
      className={`absolute ${isTechnician ? "-left-6" : "-left-20"} ${zIndexClass} mt-1 hidden h-[90px] max-h-[110px] w-[200px] transform overflow-y-auto rounded-lg border border-[#66738C] bg-background p-2 group-hover:block`}
      style={{ top: "-6rem" }}
    >
      {tasks.map((task) => {
        const priorityStyle =
          taskPriorityStyles[
            task.priority as keyof typeof taskPriorityStyles
          ] || taskPriorityStyles.Low;

        return (
          <div
            key={task.id}
            className="mb-2 cursor-pointer truncate rounded-[3px] p-1 text-xs font-semibold transition-opacity hover:opacity-80"
            style={priorityStyle}
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick(task.id);
            }}
          >
            {task.title}
          </div>
        );
      })}
    </div>
  );
}

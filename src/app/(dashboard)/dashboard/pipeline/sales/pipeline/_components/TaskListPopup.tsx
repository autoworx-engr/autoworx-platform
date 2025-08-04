import { Task } from "@prisma/client";
import React from "react";

type TTaskListPopupProps = {
  tasks: Task[];
};

export default function TaskListPopup({ tasks }: TTaskListPopupProps) {
  return (
    <div
      className="absolute -left-20 z-[9999] mt-1 hidden h-[90px] max-h-[110px] w-[200px] transform overflow-y-auto rounded-lg border border-[#66738C] bg-background p-2 group-hover:block"
      style={{ top: "-6rem" }}
    >
      {tasks.map((task) => (
        <div
          key={task.id}
          className="mb-2 rounded-[3px] p-1 text-white"
          style={{
            backgroundColor:
              task.priority === "Low"
                ? "#6571FF"
                : task.priority === "Medium"
                  ? "#25AADD"
                  : "#006D77",
          }}
        >
          {task.title}
        </div>
      ))}
    </div>
  );
}

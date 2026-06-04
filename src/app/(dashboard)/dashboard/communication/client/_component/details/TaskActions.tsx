"use client";

import { completeTask } from "@/actions/task/completeTask";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { Task, User } from "@prisma/client";
import { CircleCheckBig, SquarePen } from "lucide-react";
import { useTransition } from "react";

type TaskWithAssignedUsers = Task & {
  assignedUsers: User[];
};

type TProps = {
  task: TaskWithAssignedUsers;
  color?: string;
};

export default function TaskActions({ task, color }: TProps) {
  const [pending, startTransaction] = useTransition();

  return (
    <span className="flex items-center gap-x-2">
      <TaskCreateOrEdit
        fromEdit
        taskId={task.id}
        triggerIcon={
          <SquarePen
            className="w-4 h-4 opacity-70 hover:opacity-100 cursor-pointer"
            style={color ? { color } : undefined}
          />
        }
      />

      <button
        disabled={pending}
        className="disabled:text-gray-400"
        onClick={() =>
          startTransaction(async () => {
            await completeTask(task.id);
          })
        }
      >
        <CircleCheckBig
          className="cursor-pointer w-4 h-4 opacity-70 hover:opacity-100"
          style={color ? { color } : undefined}
        />
      </button>
    </span>
  );
}

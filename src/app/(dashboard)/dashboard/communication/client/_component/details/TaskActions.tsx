"use client";

import { deleteTask } from "@/actions/task/deleteTask";
import { usePopupStore } from "@/stores/popup";
import { Task, User } from "@prisma/client";
import { CircleCheckBig, SquarePen } from "lucide-react";
import { useTransition } from "react";

type TaskWithAssignedUsers = Task & {
  assignedUsers: User[];
};

type TProps = {
  usersOfCompany: User[];
  task: TaskWithAssignedUsers;
};

export default function TaskActions({ usersOfCompany, task }: TProps) {
  const [pending, startTransaction] = useTransition();
  const { open } = usePopupStore();
  return (
    <span className="flex items-center gap-x-2">
      <button
        className="disabled:text-gray-400"
        disabled={pending}
        onClick={() => {
          open("UPDATE_TASK", {
            task,
            companyUsers: usersOfCompany,
          });
        }}
      >
        <SquarePen className="w-4 h-4" />
      </button>

      <button
        disabled={pending}
        className="disabled:text-gray-400"
        onClick={() =>
          startTransaction(async () => {
            await deleteTask(task.id);
          })
        }
      >
        <CircleCheckBig className="cursor-pointer w-4 h-4" />
      </button>
    </span>
  );
}

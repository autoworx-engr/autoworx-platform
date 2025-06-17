"use client";

import { deleteTask } from "@/actions/task/deleteTask";
import { usePopupStore } from "@/stores/popup";
import { Task, User } from "@prisma/client";
import { useTransition } from "react";
import { FaRegCheckCircle } from "react-icons/fa";
import { MdOutlineEdit } from "react-icons/md";
type TProps = {
  usersOfCompany: User[];
  task: Task;
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
        <MdOutlineEdit className="cursor-pointer" />
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
        <FaRegCheckCircle className="cursor-pointer" />
      </button>
    </span>
  );
}

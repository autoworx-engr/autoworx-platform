"use client";

import { Dialog, DialogTrigger } from "@/components/Dialog";
import { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { MdOutlineEdit } from "react-icons/md";
import TaskContentModal from "./TaskContentModal";
import { Task } from "@prisma/client";

type NewTaskProps = {
  onlyOneUser?: boolean;
  isClientTask?: boolean;
  clientId?: number | null;
  leadId?: number | null;
  invoiceId?: string | null;
  taskId?: number | null;
  fromEdit?: boolean;
  triggerIcon?: React.ReactNode;
  isModalOpen?: boolean;
  setIsModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDelete?: (taskId: number) => void;
};

export default function TaskCreateOrEdit({
  onlyOneUser = false,
  isClientTask = false,
  clientId = null,
  taskId,
  leadId = null,
  invoiceId = null,
  fromEdit = false,
  triggerIcon = null,
  isModalOpen = false,
  setIsModalOpen,
  onTaskCreated,
  onTaskUpdated,
  onTaskDelete,
}: NewTaskProps) {
  const state = useState(false);

  const [open, setOpen] = setIsModalOpen
    ? [isModalOpen, setIsModalOpen]
    : state;

  let openButtonIcon = null;

  if (isClientTask) {
    openButtonIcon = (
      <button className="flex items-center justify-center gap-1 rounded-full bg-blue-600 px-6 py-2 text-[15px] text-white">
        <FaPlus className="" />
        <span>Add task</span>
      </button>
    );
  } else if (triggerIcon) {
    openButtonIcon = triggerIcon;
  } else {
    openButtonIcon = (
      <button className="flex w-full min-w-32 items-center justify-center gap-1 rounded-md bg-blue-600 px-2 py-2 text-[15px] text-white max-[1300px]:py-1">
        {fromEdit ? (
          <MdOutlineEdit className="mr-2 cursor-pointer" />
        ) : (
          <FaPlus className="" />
        )}
        <span className="block">{fromEdit ? "Update Task" : "Add Task"}</span>
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!setIsModalOpen && (
        <DialogTrigger
          asChild
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {openButtonIcon}
        </DialogTrigger>
      )}
      {open && (
        <TaskContentModal
          leadId={leadId}
          invoiceId={invoiceId}
          onTaskCreated={onTaskCreated}
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDelete}
          clientId={clientId}
          fromEdit={fromEdit}
          onClose={() => setOpen(false)}
          onlyOneUser={onlyOneUser}
          taskId={taskId}
        />
      )}
    </Dialog>
  );
}

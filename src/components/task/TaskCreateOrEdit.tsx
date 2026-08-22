"use client";

import { Dialog, DialogTrigger } from "@/components/Dialog";
import { useState } from "react";
import TaskContentModal from "./TaskContentModal";
import { Task } from "@prisma/client";
import { Plus, PencilLineIcon } from "lucide-react";
import { Button } from "../ui/button";

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
  revalidateOnDelete?: boolean;
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
  revalidateOnDelete = true,
}: NewTaskProps) {
  const state = useState(false);

  const [open, setOpen] = setIsModalOpen
    ? [isModalOpen, setIsModalOpen]
    : state;

  let openButtonIcon = null;

  if (isClientTask) {
    // 1. Client Task Context (likely a button in a client detail view)
    openButtonIcon = (
      <Button className="rounded-lg">
        <Plus size={20} />
        <span>Add Task</span>
      </Button>
    );
  } else if (triggerIcon) {
    // 2. Custom Trigger Context (used by TaskListBox, etc.) - No change, uses provided trigger.
    openButtonIcon = triggerIcon;
  } else {
    // 3. Default/Edit Context (General-purpose button)
    openButtonIcon = (
      <Button className="w-full rounded-lg">
        {fromEdit ? (
          // Icon for edit action (using PencilLineIcon, with subtle color change to match theme)
          <PencilLineIcon className="h-5 w-5 text-white" />
        ) : (
          <Plus size={20} />
        )}
        <span className="block">{fromEdit ? "Update Task" : "Add Task"}</span>
      </Button>
    );
  }

  const showTrigger = Boolean(triggerIcon) || !setIsModalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
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
          revalidateOnDelete={revalidateOnDelete}
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

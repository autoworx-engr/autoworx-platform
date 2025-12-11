"use client";

import { Dialog, DialogTrigger } from "@/components/Dialog";
import { useState } from "react";
import TaskContentModal from "./TaskContentModal";
import { Task } from "@prisma/client";
import { Plus, SquarePen } from "lucide-react";

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

// **Helper Class for Primary CTA Styling**
const primaryCtaClasses = `
  flex items-center justify-center gap-2 px-6 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out

  // Gradient Background (Blue/Indigo)
  bg-gradient-to-r from-blue-500 to-indigo-600

  // Subtle Lift and Shadow Glow on Hover
  shadow-lg shadow-blue-500/50
  hover:-translate-y-0.5
  hover:scale-[1.01]
  hover:shadow-xl hover:shadow-blue-500/70
  dark:shadow-indigo-600/50 dark:hover:shadow-indigo-600/70
`;

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

  // --- Context-Aware Button Rendering ---

  if (isClientTask) {
    // 1. Client Task Context (likely a button in a client detail view)
    openButtonIcon = (
      <button
        className={`${primaryCtaClasses} rounded-full`} // Full rounded shape for high visibility
      >
        <Plus size={20} />
        <span>Add Task</span>
      </button>
    );
  } else if (triggerIcon) {
    // 2. Custom Trigger Context (used by TaskListBox, etc.) - No change, uses provided trigger.
    openButtonIcon = triggerIcon;
  } else {
    // 3. Default/Edit Context (General-purpose button)
    openButtonIcon = (
      // Compact, professional design
      <button
        className={`${primaryCtaClasses} rounded-xl w-full px-4 py-2`} // Modern rounded-xl shape
      >
        {fromEdit ? (
          // Icon for edit action (using SquarePen, with subtle color change to match theme)
          <SquarePen className="h-5 w-5 text-white" />
        ) : (
          <Plus size={20} />
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
            // Ensure click handler prevents propagation if needed (good practice for components inside lists)
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

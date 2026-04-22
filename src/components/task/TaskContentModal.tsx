"use client";

import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import Submit from "@/components/Submit";
import { cn } from "@/lib/cn";
import { Task } from "@prisma/client";
import { Popconfirm } from "antd";
import { Trash2 } from "lucide-react";
import TaskSpinner from "@/app/(dashboard)/dashboard/task/_component/ui/TaskSpinner";
import { useTaskForm } from "@/hooks/task/useTaskForm";
import { TaskFormFields } from "./TaskFormFields";

type NewTaskProps = {
  onlyOneUser?: boolean;
  clientId?: number | null;
  taskId?: number | null;
  leadId?: number | null;
  invoiceId?: string | null;
  fromEdit?: boolean;
  onClose?: () => void;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: number) => void;
};

export default function TaskContentModal({
  onlyOneUser = false,
  clientId = null,
  leadId = null,
  invoiceId = null,
  taskId,
  fromEdit = false,
  onClose,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}: NewTaskProps) {
  const { state, actions } = useTaskForm({
    taskId,
    fromEdit,
    clientId,
    leadId,
    invoiceId,
    onClose,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
  });

  const {
    title,
    description,
    assignedUsers,
    priority,
    startTime,
    endTime,
    date,
    isLoading,
    isError,
    isFetched,
    taskData,
  } = state;

  const {
    setTitle,
    setDescription,
    setAssignedUsers,
    setPriority,
    setDate,
    handleTimeChange,
    handleSubmit,
    handleDeleteTask,
  } = actions;

  if (fromEdit && isError) {
    return null; // Error toast is handled in the hook
  }

  return (
    <DialogContent
      className={cn(
        isLoading ? "block" : "flex flex-col",
        "min-h-[500px] overflow-y-auto",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <DialogHeader>
        <DialogTitle>{fromEdit ? "Update Task" : "Add Task"}</DialogTitle>
      </DialogHeader>
      <FormError />
      {isLoading ? (
        <div className="flex min-h-[500px] my-auto items-center justify-center py-10 text-center">
          <TaskSpinner />
        </div>
      ) : (
        <form>
          <TaskFormFields
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            date={date}
            setDate={setDate}
            startTime={startTime}
            endTime={endTime}
            handleTimeChange={handleTimeChange}
            assignedUsers={assignedUsers}
            setAssignedUsers={setAssignedUsers}
            priority={priority}
            setPriority={setPriority}
            onlyOneUser={onlyOneUser}
            fromEdit={fromEdit}
            taskData={taskData}
          />

          <div
            className={cn(
              "flex justify-between gap-10 md:gap-0",
              !fromEdit && "justify-end",
            )}
          >
            {fromEdit && taskId && (
              <Popconfirm
                title="Delete Task"
                description="Are you sure you want to delete this task?"
                onConfirm={() => handleDeleteTask(taskId)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <button
                  className="text-red-500 hover:text-red-700"
                  type="button"
                >
                  <Trash2 size={20} />
                </button>
              </Popconfirm>
            )}
            <DialogFooter className=" flex flex-row justify-end space-x-2 ">
              <DialogClose asChild>
                <button
                  type="button"
                  className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
                >
                  Cancel
                </button>
              </DialogClose>
              <Submit
                className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
              "
                formAction={handleSubmit}
                disabled={isLoading || (fromEdit && !isFetched)}
              >
                Save
              </Submit>
            </DialogFooter>
          </div>
        </form>
      )}
    </DialogContent>
  );
}

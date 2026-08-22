"use client";

import TaskSpinner from "@/app/(dashboard)/dashboard/task/_component/ui/TaskSpinner";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import Submit from "@/components/Submit";
import { useTaskForm } from "@/hooks/task/useTaskForm";
import { cn } from "@/lib/cn";
import { Task } from "@prisma/client";
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
  revalidateOnDelete?: boolean;
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
  revalidateOnDelete = true,
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
    revalidateOnDelete,
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
    fieldErrors,
  } = state;

  const {
    setTitle,
    setDescription,
    setAssignedUsers,
    setPriority,
    setDate,
    handleTimeChange,
    handleSubmit,
    clearFieldError,
  } = actions;

  if (fromEdit && isError) {
    return null; // Error toast is handled in the hook
  }

  return (
    <DialogContent
      className={cn(
        isLoading ? "block" : "flex flex-col",
        "min-h-[500px] overflow-y-auto overflow-x-hidden",
      )}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <DialogHeader>
        <DialogTitle>{fromEdit ? "Update Task" : "Add Task"}</DialogTitle>
      </DialogHeader>
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
            titleError={fieldErrors.title}
            clearTitleError={() => clearFieldError("title")}
          />

          <DialogFooter className="mt-4 flex flex-row justify-end gap-2">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-md border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Cancel
              </button>
            </DialogClose>
            <Submit
              className="rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
              formAction={handleSubmit}
              disabled={
                isLoading ||
                (fromEdit && !isFetched) ||
                !title.trim() ||
                (!!date.trim() && (!startTime || !endTime))
              }
            >
              Save
            </Submit>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}

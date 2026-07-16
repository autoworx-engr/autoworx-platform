import getTaskUser from "@/actions/task/getTaskUser";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { TASK_COLOR } from "@/lib/consts";
import { usePopupStore } from "@/stores/popup";
import { User } from "@prisma/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { taskQueryKey } from "../../_constant";
import { EventDetailsSheet } from "../fullcalendar/EventDetailsSheet";
import TaskSpinner from "../ui/TaskSpinner";

type UserTask = Awaited<ReturnType<typeof getTaskUser>>[number];

type UserTaskListProps = {
  user: User;
};

function toDetailEvent(task: UserTask) {
  const dateStr = task.date
    ? new Date(task.date).toISOString().slice(0, 10)
    : null;
  const start =
    dateStr && task.startTime
      ? new Date(`${dateStr}T${task.startTime}`)
      : dateStr
        ? new Date(`${dateStr}T00:00:00`)
        : null;
  const end =
    dateStr && task.endTime ? new Date(`${dateStr}T${task.endTime}`) : null;

  return {
    id: `task-${task.id}`,
    title: task.title,
    start,
    end,
    extendedProps: {
      type: "task" as const,
      originalData: task,
    },
  };
}

export default function UserTaskList({ user }: UserTaskListProps) {
  const { open } = usePopupStore();
  const queryClient = useQueryClient();
  const [detailTask, setDetailTask] = useState<UserTask | null>(null);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);

  const {
    data: taskUser,
    isLoading,
    isError,
  } = useQuery({
    queryKey: taskQueryKey.taskByUserId(user.id.toString()),
    queryFn: async () => {
      return getTaskUser(user.id);
    },
  });

  const refreshUserTasks = () => {
    queryClient.invalidateQueries({
      queryKey: taskQueryKey.taskByUserId(user.id.toString()),
    });
    queryClient.invalidateQueries({ queryKey: taskQueryKey.allTaskByScroll });
  };

  let content = null;

  if (isLoading && !isError) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <TaskSpinner />
        <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
          Loading tasks...
        </h3>
      </div>
    );
  } else if (!isLoading && isError) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-4 h-12 w-12 rounded-full bg-red-500"></div>
        <h3 className="text-lg font-semibold text-red-600 md:text-[#797979]">
          Error loading tasks
        </h3>
        <p className="text-sm text-gray-500">
          Please try again later or contact support.
        </p>
      </div>
    );
  } else if (!isLoading && !isError && taskUser && taskUser.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-4 h-12 w-12 rounded-full bg-gray-300"></div>
        <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
          No tasks found for this user
        </h3>
        <p className="text-sm text-gray-500">
          You can assign tasks to this user.
        </p>
      </div>
    );
  } else if (!isLoading && !isError && taskUser && taskUser.length > 0) {
    content = (
      <div className="space-y-1">
        {taskUser.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => setDetailTask(task)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: TASK_COLOR[task.priority] }}
            />
            <span className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">
              {task.title}
            </span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="my-3">
      {content}

      <button
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/40 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10"
        onClick={() =>
          open("ASSIGN_TASK", {
            user,
            userTasks: taskUser,
          })
        }
      >
        + Assign Task
      </button>

      {/* Shared calendar detail sheet — opened on task click */}
      <EventDetailsSheet
        isOpen={!!detailTask}
        onOpenChange={(o) => {
          if (!o) {
            setDetailTask(null);
            refreshUserTasks();
          }
        }}
        selectedEvent={detailTask ? toDetailEvent(detailTask) : null}
        onEditTask={() => {
          const id = detailTask?.id ?? null;
          setDetailTask(null);
          setEditTaskId(id);
        }}
        onEditAppointment={() => {}}
      />

      {/* Edit modal opened from the detail sheet's "Edit Task" button */}
      {editTaskId !== null && (
        <TaskCreateOrEdit
          fromEdit
          taskId={editTaskId}
          revalidateOnDelete={false}
          isModalOpen
          setIsModalOpen={(value) => {
            const next = typeof value === "function" ? value(true) : value;
            if (!next) setEditTaskId(null);
          }}
          onTaskUpdated={refreshUserTasks}
          onTaskDelete={refreshUserTasks}
        />
      )}
    </div>
  );
}

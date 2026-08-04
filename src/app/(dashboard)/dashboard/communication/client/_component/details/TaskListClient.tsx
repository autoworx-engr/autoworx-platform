"use client";

import { useEffect, useState } from "react";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { taskPriorityStyles } from "@/lib/taskPriorityStyles";
import { Task, User } from "@prisma/client";
import TaskActions from "./TaskActions";

type TaskWithAssignedUsers = Task & { assignedUsers: User[] };

export default function TaskListClient({
  tasks: initialTasks,
  clientId,
}: {
  tasks: TaskWithAssignedUsers[];
  clientId: number;
}) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const removeTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Task List
        </h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
          {tasks?.length || 0}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {tasks?.length ? (
          tasks.map((task) => {
            const style =
              taskPriorityStyles[task.priority ?? "Low"] ??
              taskPriorityStyles.Low;
            return (
              <div
                key={task.id}
                className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={style}
                title={task.title}
              >
                <span
                  className="truncate max-w-[12rem]"
                  style={{ color: style.color }}
                >
                  {task.title.length > 40
                    ? task.title.slice(0, 40) + "…"
                    : task.title}
                </span>
                <TaskActions
                  task={task}
                  color={style.color as string}
                  onTaskRemoved={removeTask}
                />
              </div>
            );
          })
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No tasks yet — add one below.
          </p>
        )}

        <div className="ml-auto">
          <TaskCreateOrEdit isClientTask={true} clientId={clientId} />
        </div>
      </div>
    </section>
  );
}

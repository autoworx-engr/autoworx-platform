"use client";

import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { cn } from "@/lib/cn";
import { Task, User } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import TaskActions from "./TaskActions";

type TaskWithUsers = Task & { assignedUsers: User[] };

const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-[#6571FF]/10 text-[#6571FF] border-[#6571FF]/30",
  Medium: "bg-[#25AADD]/10 text-[#25AADD] border-[#25AADD]/30",
  High: "bg-[#006D77]/10 text-[#006D77] border-[#006D77]/30",
};

export default function TaskListSection({
  clientId,
  tasks,
}: {
  clientId: number;
  tasks: TaskWithUsers[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
            TASKS
          </h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
            {tasks.length}
          </span>
        </button>
        <ChevronDown
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "h-4 w-4 cursor-pointer text-zinc-400 transition-transform",
            !open && "-rotate-90",
          )}
        />
      </header>

      {open && (
        <div className="mt-3 space-y-1.5">
          {tasks.length === 0 ? (
            <p className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
              No tasks yet — add one below.
            </p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                  PRIORITY_STYLES[task.priority ?? "Low"] ??
                    "bg-zinc-50 text-zinc-700 border-zinc-200",
                )}
                title={task.title}
              >
                <span className="truncate font-medium">
                  {task.title.length > 40
                    ? task.title.slice(0, 40) + "…"
                    : task.title}
                </span>
                <TaskActions task={task} />
              </div>
            ))
          )}

          <div className="flex justify-end pt-1">
            <TaskCreateOrEdit isClientTask={true} clientId={clientId} />
          </div>
        </div>
      )}
    </section>
  );
}

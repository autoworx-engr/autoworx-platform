"use client";

import { completeTask } from "@/actions/task/completeTask";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { CirclePlus, X } from "lucide-react";
import { create } from "mutative";

interface TasksInputProps {
  tasks: { id: undefined | number; task: string }[];
}
export function TasksInput({ tasks }: TasksInputProps) {
  // const tasks = useEstimateCreateStore((x) => x.tasks);

  return (
    <div className="rounded border border-solid border-slate-500">
      <div className="aspect-[2/1] space-y-2 overflow-y-auto p-4">
        <button
          type="button"
          onClick={() => {
            useEstimateCreateStore.setState(({ tasks }) => ({
              tasks: [...tasks, { id: undefined, task: "" }],
            }));
          }}
          className="flex items-center gap-1 text-primary"
        >
          <CirclePlus size={20} />
          Task
        </button>
        {tasks.map((task, i) => (
          <label key={i} className="relative block">
            <input
              value={task.task}
              onChange={(event) =>
                useEstimateCreateStore.setState((x) =>
                  create(x, (x) => {
                    x.tasks[i] = {
                      id: task.id,
                      task: event.currentTarget.value,
                    };
                  }),
                )
              }
              className="block w-full rounded border border-solid border-slate-500 px-2 py-1"
              placeholder="Task Name: Task Description"
            />
            <button
              type="button"
              onClick={async () => {
                useEstimateCreateStore.setState(({ tasks }) => ({
                  tasks: tasks.toSpliced(i, 1),
                }));
                task.id && (await completeTask(task.id));
              }}
              className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 text-[#6470FF]"
            >
              <div className="rounded-full bg-primary p-1 text-white">
                <X size={10} />
              </div>
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}

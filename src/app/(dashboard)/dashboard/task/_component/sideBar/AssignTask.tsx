import Popup from "@/components/Popup";
import { usePopupStore } from "@/stores/popup";
import { useEffect, useState } from "react";
import FormError from "@/components/FormError";
import { Task, User } from "@prisma/client";
import Submit from "@/components/Submit";
import { assignTask } from "@/actions/task/assignTask";
import Avatar from "@/components/Avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskQueryKey } from "../../_constant";
import TaskSpinner from "../ui/TaskSpinner";
import TaskError from "../ui/TaskError";
import TaskNotFound from "../ui/TaskNotFound";
import getAllTasks from "@/actions/task/getAllTasks";

export default function AssignTask() {
  const {
    data: tasks = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: [taskQueryKey.allTasks],
    queryFn: async () => {
      const response = await getAllTasks({
        select: {
          id: true,
          title: true,
          priority: true,
          date: true,
          startTime: true,
          endTime: true,
        },
      });
      return response.data;
    },
  });

  const queryClient = useQueryClient();
  const { data, close } = usePopupStore();
  const user = data.user as User;
  const assignedUserTasks = data.userTasks as Task[];

  const [taskDataInput, setTaskDataInput] = useState<
    { taskId: number; assigned: boolean }[]
  >([]);

  useEffect(() => {
    setTaskDataInput(
      tasks.map((task) => ({
        taskId: task.id,
        assigned: assignedUserTasks.some((userTask) => userTask.id === task.id),
      }))
    );
  }, [tasks, assignedUserTasks]);

  async function handleSubmit() {
    await assignTask({ userId: user.id, tasksToAssign: taskDataInput });

    queryClient.setQueryData(
      taskQueryKey.taskByUserId(user.id.toString()),
      () => {
        return tasks.filter((task) =>
          taskDataInput.some(
            (inputTask) => inputTask.taskId === task.id && inputTask.assigned
          )
        );
      }
    );

    close();
  }
  let content = null;
  if (isLoading && !isError) {
    content = <TaskSpinner />;
  } else if (!isLoading && isError) {
    content = <TaskError message="Fail to load tasks" />;
  } else if (!isLoading && !isError && tasks && tasks.length === 0) {
    content = <TaskNotFound message="No Tasks found" />;
  } else if (!isLoading && !isError && tasks && tasks.length > 0) {
    content = taskDataInput.map((task, i) => {
      return (
        <label key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            name="tasks"
            value={task.taskId}
            checked={task.assigned}
            onChange={(e) => {
              setTaskDataInput((prev) =>
                prev.map((prevTask, index) => {
                  if (index === i) {
                    return {
                      taskId: prevTask.taskId,
                      assigned: e.target.checked,
                    };
                  }
                  return prevTask;
                })
              );
            }}
          />
          <p className="text-lg">{tasks[i].title}</p>
        </label>
      );
    });
  }

  return (
    <Popup>
      <div className="w-[40rem] p-2 text-slate-600">
        <div>
          <h2 className="text-lg font-bold">Assign task for user</h2>

          <FormError />

          <div className="mt-1 flex items-center gap-2">
            <Avatar photo={user.image} width={50} height={50} />
            <p className="text-xl font-bold">
              {user.firstName} {user.lastName}
            </p>
          </div>

          <h2 className="mt-5 text-lg font-bold">Select tasks</h2>

          <form>
            <div className="flex max-h-[15rem] flex-col gap-2 overflow-y-auto p-2 font-bold">
              {content}
            </div>

            <div className="mt-5 flex justify-center gap-10">
              <Submit
                formAction={handleSubmit}
                className="rounded-md bg-blue-600 px-5 py-2 text-lg font-bold text-white"
              >
                Assign
              </Submit>

              <button
                type="button"
                className="ml-2 rounded-md bg-red-800 px-5 py-2 text-lg font-bold text-white"
                onClick={() => {
                  close();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Popup>
  );
}

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
import { ListChecks, UserCog, X } from "lucide-react";

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
        <label
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-300 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 ring-1 ring-transparent hover:ring-[#00b8b0] dark:hover:ring-[#0098da]"
        >
          <input
            type="checkbox"
            name="tasks"
            value={task.taskId}
            checked={task.assigned}
           
            className="form-checkbox h-5 w-5 text-[#00b8b0] rounded-md transition-all duration-200 focus:ring-2 focus:ring-[#0098da] dark:bg-slate-600 dark:checked:bg-[#0098da]"
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
          {/* Apply professional text color and typography hierarchy */}
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
            {tasks[i].title}
          </p>
        </label>
      );
    });
  }

  return (
   <Popup>
      {/* Container with modern, soft shadow and rounded corners */}
      <div className="w-[40rem] p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-slate-900/50 backdrop-blur-sm transition-colors duration-300">
        <div className="relative">
          {/* Main Title - Replaced Emoji with Lucide Icon */}
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-800 dark:text-slate-50 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
             <UserCog className="w-5 h-5 text-[#6571FF]" /> 
             Assign Tasks to User
          </h2>

          <FormError />
          
          {/* User Profile Section - Highlighted and clean */}
          <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 ring-1 ring-slate-200 dark:ring-slate-700">
            <Avatar photo={user.image} width={60} height={60} />
            <div className="flex flex-col">
                {/* Use the specified text-slate-600 for names/digits, but adjust for dark mode readability */}
                <p className="text-xl font-bold text-slate-700 dark:text-slate-100">
                    {user.firstName} {user.lastName}
                </p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {user.email} {/* Assuming email is available on User type for context */}
                </p>
            </div>
          </div>

          {/* Task Selection Section Title - Added Lucide Icon */}
          <h2 className="mt-6 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
            <ListChecks className="w-5 h-5 text-[#00b8b0]" />
            Select Tasks
          </h2>

          <form>
            {/* Task List Container - Max height with scroll and subtle glass effect for the scrollable area */}
            <div className={`
                flex max-h-[15rem] flex-col gap-1 overflow-y-auto p-3 
                bg-slate-100/30 dark:bg-slate-900/30 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700
                backdrop-blur-sm
                transition-shadow duration-300
            `}>
              {content}
            </div>

            {/* Action Buttons Section - Modern, spaced, and professional */}
            <div className="mt-8 flex justify-center gap-6">
              
              <Submit
                formAction={handleSubmit}
                // Custom Gradient and Hover Effects for Primary Action
                className="
                  rounded-xl px-6 py-3 text-lg font-extrabold text-white 
                  bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
                hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
                hover:-translate-y-0.5
                active:translate-y-0 active:scale-100
                transition-all duration-300 ease-in-out
                "
              >
                Assign
              </Submit>

            
              <button
                type="button"
                className="
                  flex items-center gap-2 rounded-xl border border-red-800/50 px-6 py-3 text-lg font-bold 
                  text-red-800 dark:text-red-400 
                  bg-white dark:bg-slate-800 
                  transition-all duration-300 ease-in-out 
                  hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-800 
                  hover:shadow-md hover:shadow-red-500/20
                "
                onClick={close}
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Popup>
  );
}

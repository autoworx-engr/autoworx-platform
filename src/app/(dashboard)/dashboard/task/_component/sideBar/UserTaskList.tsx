import { TASK_COLOR } from "@/lib/consts";
import { useQuery } from "@tanstack/react-query";
import TaskSpinner from "../ui/TaskSpinner";
import getTasks from "@/actions/task/getTaskUser";
import { taskQueryKey } from "../../_constant";
import { usePopupStore } from "@/stores/popup";
import { User } from "@prisma/client";
import getTaskUser from "@/actions/task/getTaskUser";

type UserTaskListProps = {
  user: User;
};
export default function UserTaskList({ user }: UserTaskListProps) {
  const { open } = usePopupStore();
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
    content = taskUser.map((task, index) => (
      <div className="ml-4 mt-2 flex items-center gap-2" key={index}>
        <div
          className="h-[10px] w-[10px] rounded-full"
          style={{ backgroundColor: TASK_COLOR[task.priority] }}
        ></div>
        <p className="text-[16px]">{task.title}</p>
      </div>
    ));
  }
  return (
    <div className="my-3">
      {content}

      <button
        className="mt-3 rounded-2xl bg-slate-500 px-5 py-1 text-[15px] text-white sm:text-xs"
        onClick={() =>
          open("ASSIGN_TASK", {
            user,
            userTasks: taskUser,
          })
        }
      >
        + Assign Task
      </button>
    </div>
  );
}

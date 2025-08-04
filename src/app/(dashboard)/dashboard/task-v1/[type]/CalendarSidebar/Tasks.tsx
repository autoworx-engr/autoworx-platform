import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import { Task, User } from "@prisma/client";
// import NewTask from "../components/task/NewTask";
import { MinimizeButton } from "./MinimiseButton";
import TaskComponent from "./Task";
import { FaRegClipboard } from "react-icons/fa";
import NewTask from "@/components/task/TaskCreateOrEdit";

export default function Tasks({
  tasks,
  users,
  companyUsers,
}: {
  tasks: Task[];
  users: User[];
  companyUsers: User[];
}) {
  const minimized = useCalendarSidebarStore((x) => x.minimized);

  return (
    <div
      className={cn(
        "md:app-shadow relative mt-5 flex flex-grow flex-col gap-2 overflow-hidden rounded-[12px] md:bg-background",
        minimized || "p-3",
      )}
    >
      <h2 className="-mt-4 flex items-center justify-between md:-mt-0">
        {!minimized && (
          <div className="mb-4 text-base font-semibold text-gray-900 md:text-[16px] md:text-[#797979]">
            Task List
          </div>
        )}
        <div className="hidden md:block">
          <MinimizeButton />
        </div>
      </h2>

      {!minimized && (
        <div className="thin-scrollbar space-y-2 overflow-y-auto">
          {tasks?.length > 0 ? (
            tasks?.map((task) => (
              <TaskComponent
                key={task.id}
                task={task}
                companyUsers={companyUsers}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FaRegClipboard className="mb-4 h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
                No tasks found
              </h3>
              <p className="text-sm text-gray-500">
                Stay tuned or add a new task below!
              </p>
            </div>
          )}
        </div>
      )}

      {!minimized && (
        <div className="mt-auto">
          <NewTask />
        </div>
      )}
    </div>
  );
}

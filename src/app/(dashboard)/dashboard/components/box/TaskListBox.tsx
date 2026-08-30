"use client";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import useTasksQueryForDashboard from "@/hooks/query-hook/useTasksQueryForDashboard";
import BoxTitle from "./BoxTitle";
import TaskListItem from "@/components/task/TaskListItem";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { useCanAccessRoute } from "@/hooks/useCanAccessRoute";
import { Plus, Loader2, ListEnd } from "lucide-react";
import { cn } from "@/lib/cn"; // Ensure cn is available
import { BoxRestrictedNotice } from "./BoxRestricted";

export default function TaskListBox() {
  const { data: tasks, isLoading, isError } = useTasksQueryForDashboard();

  // Calendar & Task. `useCanAccessRoute` runs the same company-feature +
  // role-permission + per-user-override chain the route guard uses, so this
  // widget can't disagree with /dashboard/task/day.
  const hasTaskPermission = useCanAccessRoute("/dashboard/task/day");

  const queryClient = useQueryClient();

  const revalidateTask = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboardTask,
    });
  };

  const handleTaskDeleted = (taskId: number) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.dashboardTask },
      (old: { id: number }[] | undefined) =>
        Array.isArray(old) ? old.filter((t) => t.id !== taskId) : old,
    );
  };

  let content = null;

  // --- Content Loading/State Logic (Enhanced for premium look) ---
  if (!hasTaskPermission) {
    content = <BoxRestrictedNotice what="calendar & task" />;
  } else if (isLoading) {
    // Enhanced loading state with pulse and improved visual
    content = (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  } else if (isError) {
    content = (
      <div className="flex flex-1 items-center justify-center p-4">
        <span className="text-base font-medium text-red-500 dark:text-red-400">
          Error loading tasks.
        </span>
      </div>
    );
  } else if (tasks && tasks.length === 0) {
    // Enhanced empty state
    content = (
      <div className="flex flex-1 flex-col items-center justify-center self-center p-8 text-center my-auto">
        <ListEnd className="w-8 h-8 text-emerald-500 mb-3" />
        <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">
          Task List Clear
        </span>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          No upcoming tasks scheduled for now.
        </p>
      </div>
    );
  } else if (tasks && tasks.length > 0) {
    content = tasks.map((task, idx) => (
      <TaskListItem key={idx} task={task} onTaskRemoved={handleTaskDeleted} />
    ));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl shadow-lg transition-all duration-300 lg:h-full">
      <div
        className={cn(
          `
          flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6 lg:h-full
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md
          rounded-2xl
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-xl dark:shadow-2xl dark:shadow-blue-900/20
          transition-all duration-300
        `,
        )}
      >
        {/* BoxTitle (Assumed to be a clean heading component) */}
        <BoxTitle
          title="Task List"
          redirectLink={hasTaskPermission ? "/dashboard/task/day" : undefined}
          className="mb-4 flex-shrink-0"
        />

        {/* Task List Content Area - Uses min-h-0 to allow scrolling  */}
        <div className="flex flex-1 flex-col space-y-3 overflow-y-auto overflow-x-hidden min-h-0 max-h-[40vh] md:max-h-none">
          {content}
        </div>

        {/* Add Task Button (Primary CTA) */}
        {hasTaskPermission && (
          <div className="mt-auto pt-4 flex w-full justify-center md:w-auto md:justify-start flex-shrink-0">
            <TaskCreateOrEdit
              onTaskCreated={revalidateTask}
              triggerIcon={
                <button
                  className={`
                    flex w-full min-w-36 items-center justify-center gap-1 rounded-xl px-6 py-2.5 text-base font-bold text-white transition-all duration-300 ease-in-out

                    // Gradient Background (Blue to Indigo)
                    bg-gradient-to-r from-primary to-[#5a66ee]

                    // Subtle Lift and Shadow Glow on Hover
                    shadow-md shadow-primary/40 
                    hover:-translate-y-0.5
                    hover:scale-[1.01]
                    hover:shadow-lg hover:shadow-primary/60
                    dark:shadow-primary/50 dark:hover:shadow-primary/60
                  `}
                  aria-label="Add new task"
                >
                  <Plus className="h-5 w-5" />
                  <span className="block">Add New Task</span>
                </button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

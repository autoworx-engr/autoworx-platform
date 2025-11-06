"use client";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import useTasksQueryForDashboard from "@/hooks/query-hook/useTasksQueryForDashboard";
import BoxTitle from "./BoxTitle";
import Task from "./Task";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissionStore } from "@/stores/permissionStore";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useGetCompanyPermissions } from "@/hooks/feature-permissions/useGetCompanyPersmissions";
import { Plus, Loader2, ListEnd, ShieldOff } from "lucide-react"; // Added ShieldOff and ListEnd for states
import { cn } from "@/lib/cn"; // Ensure cn is available

export default function TaskListBox() {
  const { data: tasks, isLoading, isError } = useTasksQueryForDashboard();
  const { permissions } = usePermissionStore();
  const user = useGetCurrentUser();
  const companyId = user?.companyId;
  const companyEmployeePermissions = permissions?.companyPermissions;
  const userPermissions = permissions?.userPermissions;
  const { data } = useGetCompanyPermissions(companyId!);

  const queryClient = useQueryClient();

  const revalidateTask = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboardTask,
    });
  };

  const handleTaskDeleted = (taskId: number) => {
    // Immediately update the UI by invalidating queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboardTask,
    });
  };

  let content = null;

  // Check if calendarAndTask feature permission is enabled at company
  const calendarAndTaskFeatureEnabled =
    data?.data?.find(
      (permission: any) => permission.permission_name === "calendar"
    )?.enabled !== false;

  const hasTaskPermission =
    calendarAndTaskFeatureEnabled &&
    (userPermissions?.calendarTask !== undefined
      ? userPermissions.calendarTask
      : companyEmployeePermissions?.calendarTask !== false);

  // --- Content Loading/State Logic (Enhanced for premium look) ---
  if (!hasTaskPermission) {
    // Redesigned Permission Denied State
    content = (
      <div className="flex flex-1 flex-col items-center justify-center self-center p-8 text-center my-auto">
        <ShieldOff className="w-8 h-8 text-rose-500 mb-3" />
        <span className="text-base font-semibold text-slate-700 dark:text-slate-300">
          Permission Required
        </span>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Contact administrator to view task access.
        </p>
      </div>
    );
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
      // Note: Task component needs its own styling update for premium look
      <Task key={idx} task={task} onTaskDeleted={handleTaskDeleted} />
    ));
  }

  return (
    <div className="flex-1 h-full shadow-lg transition-all duration-300">
      <div
        className={cn(
          `
          flex h-full flex-col p-4 md:p-6

          // Premium Card/Glassmorphism Container Style (Enhanced)
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md
          rounded-2xl
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-xl dark:shadow-2xl dark:shadow-blue-900/20
          transition-all duration-300
          overflow-hidden // Important for height control
        `
        )}
      >
        {/* BoxTitle (Assumed to be a clean heading component) */}
        <BoxTitle
          title="Task List"
          redirectLink={hasTaskPermission ? "/dashboard/task/day" : undefined}
          className="mb-4 flex-shrink-0"
        />

        {/* Task List Content Area - Uses min-h-0 to allow scrolling */}
        <div className="thin-scrollbar flex flex-1 flex-col space-y-3 overflow-y-auto overflow-x-hidden min-h-0">
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
                    bg-gradient-to-r from-blue-600 to-indigo-700

                    // Subtle Lift and Shadow Glow on Hover
                    shadow-md shadow-blue-500/50
                    hover:-translate-y-0.5
                    hover:scale-[1.01]
                    hover:shadow-xl hover:shadow-blue-500/70
                    dark:shadow-indigo-600/50 dark:hover:shadow-indigo-600/70
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

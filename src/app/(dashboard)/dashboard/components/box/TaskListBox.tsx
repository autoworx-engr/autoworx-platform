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
import { Plus } from "lucide-react";

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

  // const shouldHideRedirectLink =
  //   permissions?.role !== "Admin" &&
  //   companyEmployeePermissions?.calendarTask === false;

  const hasTaskPermission =
    calendarAndTaskFeatureEnabled &&
    (userPermissions?.calendarTask !== undefined
      ? userPermissions.calendarTask
      : companyEmployeePermissions?.calendarTask !== false);

  // Check permission and show message if no access
  if (!hasTaskPermission) {
    content = (
      <div className="flex flex-1 items-center justify-center self-center text-center">
        <span className="text-sm text-gray-500">
          You do not have permission to view tasks. Please contact your
          administrator.
        </span>
      </div>
    );
  } else if (isLoading && !isError) {
    content = <div className="text-center text-gray-500">Loading tasks...</div>;
  } else if (!isLoading && isError) {
    content = (
      <div className="text-center text-red-500">Error loading tasks</div>
    );
  } else if (!isLoading && !isError && tasks && tasks.length === 0) {
    content = (
      <div className="flex flex-1 items-center justify-center self-center text-center">
        <span className="text-sm text-gray-500">
          You have no upcoming tasks
        </span>
      </div>
    );
  } else if (!isLoading && !isError && tasks && tasks.length > 0) {
    content = tasks.map((task, idx) => (
      <Task key={idx} task={task} onTaskDeleted={handleTaskDeleted} />
    ));
  }
  return (
    <div className="flex-1 h-full overflow-y-auto shadow-md">
      <div
        className={`flex h-full flex-col overflow-y-auto rounded-md p-4 shadow-lg md:p-6`}
      >
        <BoxTitle
          title="Task List"
          redirectLink={hasTaskPermission ? "/dashboard/task/day" : undefined}
        />
        <div className="thin-scrollbar my-2 flex max-h-64 flex-1 flex-col space-y-2 overflow-x-hidden lg:max-h-full">
          {content}
        </div>
        {hasTaskPermission && (
          <div className="mt-auto flex w-full justify-center md:w-20 md:justify-start">
            {/* <NewTask companyUsers={companyUsers} /> */}
            <TaskCreateOrEdit
              triggerIcon={
                <button className="flex w-full min-w-32 items-center justify-center gap-1 rounded-md bg-blue-600 px-2 py-2 text-[15px] text-white max-[1300px]:py-1">
                  <Plus className="" />
                  <span className="block">Add Task</span>
                </button>
              }
              onTaskCreated={revalidateTask}
            />
          </div>
        )}
      </div>
    </div>
  );
}

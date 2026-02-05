import { useEffect, useState } from "react";
import Avatar from "../Avatar";
import { EmployeeType, User } from "@prisma/client";
import useEmployeeQuery from "@/hooks/query-hook/useEmployeeQuery";
import TaskSpinner from "@/app/(dashboard)/dashboard/task/_component/ui/TaskSpinner";
import TaskError from "@/app/(dashboard)/dashboard/task/_component/ui/TaskError";
import TaskNotFound from "@/app/(dashboard)/dashboard/task/_component/ui/TaskNotFound";
import { Search, X } from "lucide-react";

type TAssignedUser = {
  title: string;
  employeeType: EmployeeType;
  assignedUsers: User[];
  onAssignUser?: (user: User) => void;
  onRemoveAssignedUser?: (user: User) => void;
};

export default function AssignUsers({
  title,
  employeeType,
  assignedUsers,
  onAssignUser,
  onRemoveAssignedUser,
}: TAssignedUser) {
  const {
    data: employees = [],
    isLoading,
    isError,
    isSuccess,
  } = useEmployeeQuery(employeeType, { enabled: true });

  const [employeeList, setEmployeeList] = useState<User[]>([]);

  // Calculate available employees by filtering out assigned users from the original employees data
  useEffect(() => {
    if (isSuccess && employees) {
      // Always start from the original employees data and filter out assigned users
      const availableEmployees = employees.filter(
        (employee) =>
          !assignedUsers.some(
            (assignedUser) => assignedUser.id === employee.id,
          ),
      );
      setEmployeeList(availableEmployees);
    }
  }, [isSuccess, employees, assignedUsers]);

  const [addEmployeePersonOpen, setAddEmployeePersonOpen] = useState(false);
  const [assignedEmployeeSearch, setAssignedEmployeeSearch] = useState("");

  const doAssignUser = (user: User) => {
    onAssignUser && onAssignUser(user);
    setAssignedEmployeeSearch("");
    setAddEmployeePersonOpen(false);
    // No need to manually update employeeList as the useEffect will handle it
  };

  const doRemoveAssignedUser = (user: User) => {
    onRemoveAssignedUser && onRemoveAssignedUser(user);
    // No need to manually update employeeList as the useEffect will handle it
  };

  let content = null;
  if (isLoading && !isError) {
    content = <TaskSpinner />;
  } else if (!isLoading && isError) {
    content = (
      <TaskError message={`Failed to load ${employeeType} user data`} />
    );
  } else if (!isLoading && !isError && employeeList.length === 0) {
    content = <TaskNotFound message={`No ${employeeType} user found`} />;
  } else if (!isLoading && !isError && employeeList.length > 0) {
    content = (
      <div className="max-h-[220px] overflow-y-auto thin-scrollbar space-y-1">
        {employeeList
          .filter((employee) => {
            const fullName =
              `${employee.firstName} ${employee.lastName}`.toLowerCase();
            return fullName.includes(assignedEmployeeSearch.toLowerCase());
          })
          .map((employee, index) => (
            <button
              key={`${employee.id}-${index}`}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-gray-100 border-gray-200 text-left transition-all ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${employeeList.length - 1 === index ? "" : "border-b"}`}
              onClick={() => doAssignUser(employee)}
              type="button"
            >
              <Avatar
                photo={employee.image}
                width={50}
                height={50}
                alt={`${employee.firstName} ${employee.lastName}`}
              />

              <p className="font-medium">
                {employee.firstName} {employee.lastName}
              </p>
            </button>
          ))}
      </div>
    );
  }
  return (
    <>
      {/* Add Employee Trigger */}
      <button
        type="button"
        className="group relative mb-4 font-medium text-[#6571FF] transition-all duration-300"
        onClick={() => setAddEmployeePersonOpen(true)}
      >
        {title}
        <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full bg-[#6571FF]" />
      </button>

      {/* Assigned Users List */}
      <div className="space-y-2 mb-4">
        {assignedUsers.map((user, index) => {
          const fullName = `${user.firstName} ${user.lastName}`;
          return (
            <div
              key={`${user.id}-${index}`}
              className="group flex items-center justify-between gap-x-4 rounded-xl bg-white py-1.5 px-2 ring-1 ring-slate-200 transition-all duration-300 hover:shadow-md hover:ring-[#6571FF]/30 active:scale-[0.99] animate-in fade-in slide-in-from-left-2"
            >
              <div className="flex items-center gap-x-3">
                <div className="relative">
                  <Avatar
                    photo={user.image}
                    width={36}
                    height={36}
                    alt={fullName}
                    className="rounded-full ring-2 ring-white shadow-sm"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                  {fullName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => doRemoveAssignedUser(user)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Search & Add New Surface */}
      {addEmployeePersonOpen && (
        <div className="relative mt-4 space-y-4 rounded-2xl bg-slate-50/80 p-4 shadow-inner ring-1 ring-slate-200/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between gap-4">
            {/* Modern Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400"
              />
              <input
                name="search"
                className="h-10 w-full rounded-xl border-none bg-white pl-10 pr-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-[#6571FF]/30 outline-none placeholder:text-slate-400"
                type="text"
                placeholder="Search employees..."
                value={assignedEmployeeSearch}
                onChange={(e) => setAssignedEmployeeSearch(e.target.value)}
              />
            </div>

            {/* Close Search Button */}
            <button
              onClick={() => setAddEmployeePersonOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-rose-50 hover:text-rose-500 hover:ring-rose-200"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Results Content Area */}
          <div className="max-h-60 overflow-y-auto rounded-xl bg-white/50 p-0.5 ring-1 ring-slate-200/50">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

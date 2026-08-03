import TaskError from "@/app/(dashboard)/dashboard/task/_component/ui/TaskError";
import EmptyMsg from "@/components/common/EmptyMsg";
import TaskSpinner from "@/app/(dashboard)/dashboard/task/_component/ui/TaskSpinner";
import useEmployeeQuery from "@/hooks/query-hook/useEmployeeQuery";
import { EmployeeType, User } from "@prisma/client";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";

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

  // Filter before rendering so the empty state reflects the *searched* list —
  // checking employeeList alone showed a blank box when a search matched
  // nothing. Trimmed so surrounding whitespace can't discard every match.
  const normalizedSearch = assignedEmployeeSearch.trim().toLowerCase();
  const visibleEmployees = normalizedSearch
    ? employeeList.filter((employee) =>
        `${employee.firstName} ${employee.lastName}`
          .toLowerCase()
          .includes(normalizedSearch),
      )
    : employeeList;

  let content = null;
  if (isLoading && !isError) {
    content = <TaskSpinner />;
  } else if (!isLoading && isError) {
    content = (
      <TaskError message={`Failed to load ${employeeType} user data`} />
    );
  } else if (!isLoading && !isError && visibleEmployees.length === 0) {
    content = (
      <EmptyMsg
        message={
          normalizedSearch
            ? `No ${employeeType} user matches "${assignedEmployeeSearch.trim()}"`
            : `No ${employeeType} user found`
        }
      />
    );
  } else if (!isLoading && !isError && visibleEmployees.length > 0) {
    content = (
      <div className="thin-scrollbar max-h-[220px] space-y-0.5 overflow-y-auto p-1">
        {visibleEmployees.map((employee, index) => (
          <button
            key={`${employee.id}-${index}`}
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent"
            onClick={() => doAssignUser(employee)}
            type="button"
          >
            <Avatar
              photo={employee.image}
              width={32}
              height={32}
              alt={`${employee.firstName} ${employee.lastName}`}
            />
            <p className="text-sm font-medium text-slate-700">
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
        className="group relative mb-4 font-medium text-primary transition-all duration-300"
        onClick={() => {
          setAssignedEmployeeSearch("");
          setAddEmployeePersonOpen(true);
        }}
      >
        {title}
        {/* <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full bg-primary" /> */}
      </button>

      {/* Assigned Users List */}
      <div className="no-visible-scrollbar my-3 flex max-h-44 w-full flex-wrap items-center gap-2 overflow-y-auto p-1">
        {assignedUsers.map((user, index) => {
          const fullName = `${user.firstName} ${user.lastName}`;
          return (
            <div
              key={`${user.id}-${index}`}
              className="group flex items-center gap-x-2 rounded-full bg-slate-100/80 px-3 py-1.5 ring-1 ring-slate-200/60 transition-all duration-300 hover:bg-white hover:ring-primary/30 hover:shadow-sm animate-in fade-in zoom-in-95"
            >
              <Avatar
                photo={user.image}
                width={22}
                height={22}
                alt={fullName}
                className="rounded-full ring-1 ring-white shadow-sm"
              />
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                {fullName}
              </span>

              <button
                type="button"
                onClick={() => doRemoveAssignedUser(user)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-rose-100 hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}

        {assignedUsers.length === 0 && (
          <p className="ml-1 text-xs italic text-slate-400">
            {employeeType === "Sales"
              ? "No sales person assigned yet."
              : "No Technician assigned yet."}
          </p>
        )}
      </div>

      {/* Search & Add New Surface */}
      {addEmployeePersonOpen && (
        <div className="relative mt-3 space-y-3 rounded-lg border bg-muted/30 p-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2">
            {/* Search Input (shadcn Input style) */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                name="search"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                type="text"
                placeholder="Search Employees..."
                value={assignedEmployeeSearch}
                onChange={(e) => setAssignedEmployeeSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Close Search Button */}
            <button
              type="button"
              onClick={() => {
                setAssignedEmployeeSearch("");
                setAddEmployeePersonOpen(false);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Results Content Area */}
          <div className="max-h-60 overflow-y-auto rounded-md border bg-background">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

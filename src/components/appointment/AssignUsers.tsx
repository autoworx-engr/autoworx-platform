import { useEffect, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import Avatar from "../Avatar";
import { IoCloseSharp } from "react-icons/io5";
import { EmployeeType, User } from "@prisma/client";
import useEmployeeQuery from "@/hooks/query-hook/useEmployeeQuery";
import TaskSpinner from "@/app/(dashboard)/dashboard/task/_component/ui/TaskSpinner";
import TaskError from "@/app/(dashboard)/dashboard/task/_component/ui/TaskError";
import TaskNotFound from "@/app/(dashboard)/dashboard/task/_component/ui/TaskNotFound";

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
      <div className="max-h-[220px] overflow-y-auto">
        {employeeList
          .filter((employee) => {
            const fullName =
              `${employee.firstName} ${employee.lastName}`.toLowerCase();
            return fullName.includes(assignedEmployeeSearch.toLowerCase());
          })
          .map((employee, index) => (
            <button
              key={`${employee.id}-${index}`}
              className="flex w-full cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-gray-100"
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
      <button
        type="button"
        className="text-indigo-500"
        onClick={() => setAddEmployeePersonOpen(true)}
      >
        {title}
      </button>

      {
        // Assigned users
        assignedUsers.map((user, index) => {
          return (
            <div
              key={`${user.id}-${index}`}
              className="flex items-center justify-between gap-x-4 rounded-md border border-gray-300 px-4 py-2"
            >
              <div className="flex items-center gap-x-4">
                <Avatar 
                  photo={user.image} 
                  width={30} 
                  height={30} 
                  alt={`${user.firstName} ${user.lastName}`}
                />
                <p>
                  {user.firstName} {user.lastName}
                </p>
              </div>
              <button type="button" onClick={() => doRemoveAssignedUser(user)}>
                <IoCloseSharp size={16} />
              </button>
            </div>
          );
        })
      }

      {addEmployeePersonOpen && (
        <div className="#w-[200px] relative space-y-4 rounded-lg border-2 border-slate-400">
          {/* Search */}
          <div className="%mx-auto relative mx-2 my-3 h-[35px] w-[85%] rounded-lg border-2 border-slate-400">
            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 transform text-slate-400" />
            <input
              name="search"
              className="h-full w-full rounded-lg pl-7 pr-2 focus:outline-none"
              type="text"
              placeholder="Search"
              value={assignedEmployeeSearch}
              onChange={(e) => {
                setAssignedEmployeeSearch(e.target.value);
              }}
            />
          </div>
          <FaTimes
            className="absolute right-3 top-3 -translate-y-1/2 transform cursor-pointer text-xl text-red-400"
            onClick={() => setAddEmployeePersonOpen(false)}
          />
          {content}
        </div>
      )}
    </>
  );
}

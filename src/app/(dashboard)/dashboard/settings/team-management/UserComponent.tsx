"use client";
import { teamManagementUser } from "@/actions/settings/teamManagement";
import Search from "@/app/(dashboard)/dashboard/employee/components/Search";
import { errorToast } from "@/lib/toast";
import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import { EmployeeType, Role } from "@prisma/client";
import { PencilLineIcon } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import CustomizeUserRole from "./CustomizeUserRole";

interface User {
  id: number;
  firstName: string;
  lastName: string | null;
  role: Role;
  image: string;
  employeeType: EmployeeType;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openEdit, setOpenEdit] = useState<boolean>(true);
  const { search } = useEmployeeWorkFilterStore();

  useEffect(() => {
    const usersFetchFunction = async () => {
      setIsLoading(true);
      try {
        const fetchedUsers = await teamManagementUser();
        const searchedUsers = search.toLowerCase();
        let filteredUsers = fetchedUsers.filter(
          (user) => user.employeeType !== EmployeeType.Admin,
        );
        if (searchedUsers) {
          filteredUsers = filteredUsers.filter((user) =>
            `${user.firstName} ${user.lastName}`
              .toLowerCase()
              .includes(searchedUsers),
          );
        }
        setUsers(filteredUsers);
      } catch (_error: unknown) {
        errorToast("Failed to load users");
      } finally {
        setIsLoading(false);
      }
    };

    usersFetchFunction();
  }, [search]);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setOpenEdit(false);
  };

  const handleBackClick = () => {
    setSelectedUser(null);
    setOpenEdit(true);
  };

  return (
    <div className="w-full p-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-600 sm:text-2xl">
            User Roles (Custom)
          </h2>
          <p className="text-sm text-slate-500">
            View all users and customize permissions individually.
          </p>
        </div>
      </div>

      <div className="h-full">
        {selectedUser ? (
          <CustomizeUserRole user={selectedUser} onBack={handleBackClick} />
        ) : (
          <>
            <div className="mb-4">
              <Search />
            </div>

            <div className="thin-scrollbar max-h-[72vh] overflow-y-auto pr-1">
              {isLoading && (
                <ul className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <li
                      key={index + 1}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex min-w-0 items-center">
                        <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-200" />
                        <div className="ml-4 space-y-2">
                          <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
                          <div className="h-2.5 w-20 animate-pulse rounded bg-slate-200" />
                        </div>
                      </div>
                      <div className="h-8 w-16 animate-pulse rounded-full bg-slate-200" />
                    </li>
                  ))}
                </ul>
              )}

              {!isLoading && users.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No team member matches your current search.
                </div>
              )}

              {!isLoading && (
                <ul className="space-y-3">
                  {users.map((user) => {
                    const name = `${user.firstName} ${user.lastName || ""}`;
                    return (
                      <li
                        key={user.id}
                        className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex min-w-0 items-center">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200">
                            <Image
                              src={user.image}
                              alt={name}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="ml-4 min-w-0">
                            <h4 className="truncate text-base font-semibold text-slate-600">
                              {name}
                            </h4>
                            <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                              {user.employeeType}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary/90 transition-colors hover:bg-indigo-100"
                            title={`Edit ${user.firstName}'s permissions`}
                            aria-label={`Edit ${name} permissions`}
                          >
                            <PencilLineIcon className="h-4 w-4" />
                            Edit
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserList;

"use client";
import { teamManagementUser } from "@/actions/settings/teamManagement";
import Search from "@/app/(dashboard)/dashboard/employee/components/Search";
import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import { EmployeeType, Role } from "@prisma/client";
import { SquarePen } from "lucide-react";
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openEdit, setOpenEdit] = useState<boolean>(true);
  const { search } = useEmployeeWorkFilterStore();

  useEffect(() => {
    const usersFetchFunction = async () => {
      try {
        const fetchedUsers = await teamManagementUser();
        const searchedUsers = search.toLowerCase();
        let filteredUsers = fetchedUsers.filter(
          (user) => user.employeeType !== EmployeeType.Admin
        );
        if (searchedUsers) {
          filteredUsers = filteredUsers.filter((user) =>
            `${user.firstName} ${user.lastName}`
              .toLowerCase()
              .includes(searchedUsers)
          );
        }
        setUsers(filteredUsers);
      } catch (error: any) {
        console.log(error);
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
    <div className="relative w-full p-6">
      {" "}
      {/* Added internal padding */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          User Roles (Custom)
        </h2>
        <p className="text-sm text-gray-500">
          View all users and customize permissions individually.
        </p>
      </div>
      <div className="h-full">
        {selectedUser ? (
          <CustomizeUserRole user={selectedUser} onBack={handleBackClick} />
        ) : (
          <>
            <div className="mb-4">
              <Search />
            </div>
            <div className="thin-scrollbar max-h-[95vh] overflow-y-auto pr-2">
              {" "}
              {/* Improved scroll container */}
              <ul className="space-y-3">
                {users.map((user) => {
                  const name = `${user.firstName} ${user.lastName || ""}`;
                  return (
                    <li
                      key={user.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 transition duration-150 hover:bg-gray-100 shadow-sm"
                    >
                      <div className="flex items-center min-w-0">
                        <div className="h-12 w-12 overflow-hidden rounded-full shrink-0">
                          <Image
                            src={user.image}
                            alt={name}
                            width={48}
                            height={48}
                            className="object-cover h-full w-full"
                          />
                        </div>
                        <div className="ml-4 min-w-0">
                          <h4 className="text-base font-semibold  truncate">
                            {name}
                          </h4>
                          <p className="text-xs font-medium text-[#6571FF]">
                            {user.employeeType}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="text-[#6571FF] p-2 rounded-full hover:bg-indigo-50 transition duration-150"
                          title={`Edit ${user.firstName}'s permissions`}
                        >
                          <SquarePen className="w-5 h-5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserList;

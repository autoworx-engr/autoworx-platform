import Avatar from "@/components/Avatar";
import Selector from "@/components/Selector";
import { User } from "@prisma/client";
import { useState, useMemo } from "react";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser.ts";
import { useIsAdminOrManager } from "@/utils/useIsAdminOrManager.ts";
import { X } from "lucide-react";

type TProps = {
  companyUsers: Partial<User>[];
  onlyOneUser?: boolean;
  assignedUsers: number[];
  setAssignedUsers: React.Dispatch<React.SetStateAction<number[]>>;
  fromUpdate?: boolean;
};

export default function AssignTaskDropDown({
  companyUsers,
  onlyOneUser,
  assignedUsers,
  setAssignedUsers,
  fromUpdate,
}: TProps) {
  const authUser = useGetCurrentUser();
  const isAdminOrManager = useIsAdminOrManager();

  const canRemove = isAdminOrManager || authUser?.employeeType === "Sales";

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);

  // Filter users based on admin/manager permissions
  const userForAssign = useMemo(() => {
    return isAdminOrManager
      ? companyUsers
      : companyUsers.filter((user) => user?.id === Number(authUser?.id));
  }, [companyUsers, isAdminOrManager, authUser?.id]);

  // Get available users (not already assigned)
  const availableUsers = useMemo(() => {
    return userForAssign.filter((user) => !assignedUsers.includes(user.id!));
  }, [userForAssign, assignedUsers]);

  // Get assigned user objects
  const assignedUserObjects = useMemo(() => {
    return assignedUsers
      .map((userId) => companyUsers.find((user) => user.id === userId))
      .filter(Boolean) as Partial<User>[];
  }, [assignedUsers, companyUsers]);

  const handleAssignUser = (user: Partial<User>) => {
    if (user.id) {
      if (onlyOneUser) {
        setAssignedUsers([user.id]);
      } else {
        setAssignedUsers((prev) => [...prev, user.id!]);
      }
      setSelectedUser(null);
      setSelectorOpen(false);
    }
  };

  const handleRemoveUser = (userId: number) => {
    setAssignedUsers((prev) => prev.filter((id) => id !== userId));
  };

  return (
    <div className="mb-3 flex flex-col">
      <label htmlFor="assigned_users" className="font-medium text-slate-600">
        Assign
      </label>

      {/* Display assigned users */}
      {/* <div className="#no-visible-scrollbar my-2 flex max-h-40 w-full flex-wrap items-center gap-1 overflow-y-auto">
        {assignedUserObjects.map((userInfo) => {
          const fullName = `${userInfo?.firstName} ${userInfo?.lastName}`;
          return (
            <div
              key={userInfo?.id}
              className="flex items-center gap-x-2 rounded-sm border px-3 py-2 shadow-md"
            >
              <span>{fullName}</span>
              <X
                onClick={() => handleRemoveUser(userInfo?.id!)}
                className="size-6 flex-shrink-0 cursor-pointer text-red-300 hover:text-red-500"
              />
            </div>
          );
        })}
      </div> */}
      <div className="no-visible-scrollbar my-3 flex max-h-44 w-full flex-wrap items-center gap-2 overflow-y-auto p-1">
        {assignedUserObjects.map((userInfo) => {
          const fullName = `${userInfo?.firstName} ${userInfo?.lastName}`;
          return (
            <div
              key={userInfo?.id}
              className="
          group flex items-center gap-x-2 rounded-full 
          bg-slate-100/80 px-3 py-1.5 
          ring-1 ring-slate-200/60
          transition-all duration-300
          hover:bg-white hover:ring-[#6571FF]/30 hover:shadow-sm
          animate-in fade-in zoom-in-95
        "
            >
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                {fullName}
              </span>

              {canRemove && (
                <button
                  type="button"
                  onClick={() => handleRemoveUser(userInfo?.id!)}
                  className="
            flex h-5 w-5 items-center justify-center 
            rounded-full transition-all duration-200
            hover:bg-rose-100 hover:text-rose-600
            text-slate-400
          "
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          );
        })}

        {assignedUserObjects.length === 0 && (
          <p className="text-xs italic text-slate-400 ml-1">
            No users assigned yet.
          </p>
        )}
      </div>

      {/* User selector */}
      <div className="w-full">
        <Selector
          className="max-w-full"
          label={() =>
            availableUsers.length === 0 ? "No users available" : "Select user"
          }
          items={availableUsers}
          newButton={
            <div className="text-center text-sm text-gray-500 p-2">
              {availableUsers.length === 0
                ? "All users are already assigned"
                : "Select a user from the list"}
            </div>
          }
          displayList={(user: Partial<User>) => (
            <div className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50">
              <Avatar photo={user.image} width={32} height={32} />
              <span className="font-medium text-gray-700">
                {user.firstName} {user.lastName}
              </span>
            </div>
          )}
          onSearch={(search: string) =>
            availableUsers.filter((user) => {
              const fullName =
                `${user.firstName} ${user.lastName}`.toLowerCase();
              return fullName.includes(search.toLowerCase());
            })
          }
          openState={[selectorOpen, setSelectorOpen]}
          selectedItem={selectedUser}
          setSelectedItem={setSelectedUser}
          onSelect={handleAssignUser}
          usePortal
        />
      </div>
    </div>
  );
}

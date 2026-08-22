import useInfinityUsersQuery from "@/app/(dashboard)/dashboard/task/_hook/useInfinityUsersQuery";
import Avatar from "@/components/Avatar";
import Selector from "@/components/Selector";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser.ts";
import { useIsAdminOrManager } from "@/utils/useIsAdminOrManager.ts";
import { User } from "@prisma/client";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TProps = {
  onlyOneUser?: boolean;
  assignedUsers: number[];
  setAssignedUsers: React.Dispatch<React.SetStateAction<number[]>>;
  fromUpdate?: boolean;
};

export default function AssignTaskDropDown({
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
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfinityUsersQuery(debouncedSearchTerm);

  const infiniteUsers = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const getFullName = (user: Partial<User>) => {
    const firstName = user?.firstName?.trim() ?? "";
    const lastName = user?.lastName?.trim() ?? "";
    const combinedName = `${firstName} ${lastName}`.trim();

    if (combinedName) {
      return combinedName;
    }

    return user?.email?.trim() || "Unknown user";
  };

  const currentUserForAssign = useMemo<Partial<User>[]>(() => {
    if (!authUser) {
      return [];
    }

    const normalizedId = Number(authUser.id);
    if (Number.isNaN(normalizedId)) {
      return [];
    }

    const normalizedName = authUser.name?.trim() ?? "";
    const [firstName = "", ...lastNameParts] = normalizedName.split(/\s+/);
    const lastName = lastNameParts.join(" ");

    return [
      {
        ...authUser,
        id: normalizedId,
        firstName,
        lastName,
      } as Partial<User>,
    ];
  }, [authUser]);

  const userForAssign = useMemo(() => {
    return isAdminOrManager ? infiniteUsers : currentUserForAssign;
  }, [isAdminOrManager, infiniteUsers, currentUserForAssign]);

  const availableUsers = useMemo(() => {
    return userForAssign.filter((user) => {
      if (typeof user?.id !== "number") {
        return false;
      }

      return !assignedUsers.includes(user.id);
    });
  }, [userForAssign, assignedUsers]);

  const usersById = useMemo(() => {
    const mergedUsers = [...infiniteUsers, ...currentUserForAssign];
    return mergedUsers.reduce((acc, user) => {
      if (typeof user?.id === "number") {
        acc.set(user.id, user as Partial<User>);
      }
      return acc;
    }, new Map<number, Partial<User>>());
  }, [infiniteUsers, currentUserForAssign]);

  const assignedUserObjects = useMemo(() => {
    return assignedUsers
      .map((userId) => usersById.get(userId))
      .filter(Boolean) as Partial<User>[];
  }, [assignedUsers, usersById]);

  const isSearching = debouncedSearchTerm.trim().length > 0;
  const hasAssignableUsers = userForAssign.length > 0;

  const triggerLabel = () => {
    if (availableUsers.length > 0) return "Select user";
    if (isLoading || isSearching) return "Select user";
    if (hasAssignableUsers) return "All users assigned";
    return "No users available";
  };

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

      <div className="no-visible-scrollbar my-3 flex max-h-44 w-full flex-wrap items-center gap-2 overflow-y-auto p-1">
        {assignedUserObjects.map((userInfo) => {
          const fullName = getFullName(userInfo);
          return (
            <div
              key={userInfo?.id}
              className="
          group flex items-center gap-x-2 rounded-full 
          bg-slate-100/80 px-3 py-1.5 
          ring-1 ring-slate-200/60
          transition-all duration-300
          hover:bg-white hover:ring-primary/30 hover:shadow-sm
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
          label={triggerLabel}
          items={availableUsers}
          emptyMessage={
            isSearching
              ? `No users match "${debouncedSearchTerm.trim()}"`
              : hasAssignableUsers
                ? "All users are already assigned"
                : "No users available to assign"
          }
          displayList={(user: Partial<User>) => (
            <div className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50">
              <Avatar photo={user.image} width={32} height={32} />
              <span className="font-medium text-gray-700">
                {getFullName(user)}
              </span>
            </div>
          )}
          onSearch={(search: string) => {
            setSearchTerm(search);
            return availableUsers;
          }}
          openState={[selectorOpen, setSelectorOpen]}
          selectedItem={selectedUser}
          setSelectedItem={setSelectedUser}
          onSelect={handleAssignUser}
          useInfiniteScroll={isAdminOrManager}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isAdminOrManager && isLoading}
          usePortal
        />
      </div>
    </div>
  );
}

import Avatar from "@/components/Avatar";
import { User } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser.ts";
import { useIsAdminOrManager } from "@/utils/useIsAdminOrManager.ts";
import { ChevronDown, ChevronUp, CircleX } from "lucide-react";

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
  const [users, setUsers] = useState(companyUsers);
  const [showUsers, setShowUsers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const userDivRef = useRef<HTMLDivElement>(null);

  const handleTrigger = () => {
    setShowUsers(!showUsers);
  };

  const authUser = useGetCurrentUser();

  const isAdminOrManager = useIsAdminOrManager();
  const userForAssign = isAdminOrManager
    ? users
    : users.filter((user) => user?.id === Number(authUser?.id));

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (showUsers) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [showUsers]);

  // Initialize users list once on mount
  useEffect(() => {
    if (fromUpdate && assignedUsers && assignedUsers.length > 0) {
      // For updates: filter out already assigned users from the available users list
      const filteredUsers = companyUsers.filter((user) => {
        return !assignedUsers.includes(user.id!);
      });
      setUsers(filteredUsers);
    }
    // For new tasks: keep all company users available (no filtering needed)
  }, []); // Empty dependency array to run only once on mount

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (!fromUpdate) {
        setAssignedUsers([]);
      }
    };
  }, []);

  const handleRemoveUser = (userId: number) => {
    const findUser = companyUsers.find((user) => user.id === userId);
    setUsers((prevUsers) => prevUsers.concat(findUser as User));
    setAssignedUsers((prevAssignUserId) =>
      prevAssignUserId.filter((id) => id !== userId),
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (userDivRef.current && !userDivRef.current.contains(event.target)) {
        setShowUsers(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="mb-3 flex flex-col">
        <label htmlFor="assigned_users">Assign</label>
        <div className="#no-visible-scrollbar my-2 flex max-h-40 w-full flex-wrap items-center gap-1 overflow-y-auto">
          {assignedUsers?.length > 0 &&
            assignedUsers.map((userId) => {
              const userInfo = companyUsers.find((user) => user.id === userId);
              const fullName = userInfo?.firstName + " " + userInfo?.lastName;
              return (
                <div
                  key={userId}
                  className={cn(
                    //   buttonVariants({ variant: "outline" }),
                    "flex items-center gap-x-2 rounded-sm border px-3 py-2 shadow-md",
                  )}
                >
                  <span>{fullName}</span>
                  <CircleX
                    onClick={() => handleRemoveUser(userId)}
                    className="size-6 flex-shrink-0 cursor-pointer text-red-300"
                  />
                </div>
              );
            })}
        </div>

        {!onlyOneUser && showUsers ? (
          <div className="relative">
            <input
              ref={inputRef}
              onChange={(event) => setSearchTerm(event.target.value)}
              onBlur={() => {
                if (users.length === 0) {
                  setShowUsers(false);
                }
              }}
              type="text"
              placeholder="Search Users"
              name="searchUsers"
              className="flex w-full items-center justify-end rounded-md border-2 border-gray-500 p-2"
            />
            {users.length > 0 && (
              <div
                ref={userDivRef}
                className={cn(
                  "#no-visible-scrollbar mt-2 flex max-h-56 w-full flex-col gap-2 overflow-y-auto p-2 font-bold lg:w-[460px]",
                  "#overflow-hidden absolute top-[45px] z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
                  "p-3 pt-6",
                )}
              >
                <button
                  onClick={() => setShowUsers(false)}
                  type="button"
                  className="sticky right-2 top-0 z-50 ml-auto"
                >
                  <CircleX size={30} className="text-red-300" />
                </button>
                {(() => {
                  const filtered = userForAssign.filter((user) => {
                    const fullName =
                      (user.firstName || "") + " " + (user.lastName || "");
                    return fullName
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-6 text-center text-zinc-500">
                        Result not found
                      </div>
                    );
                  }

                  return filtered.map((user) => (
                    <label
                      htmlFor={user?.id!.toString()}
                      key={user.id}
                      className="flex cursor-pointer items-center gap-2"
                      onClick={() => {
                        setAssignedUsers([...assignedUsers, user?.id!]);
                        setUsers((prevUser) =>
                          prevUser.filter((u) => user.id !== u.id),
                        );
                      }}
                    >
                      <Avatar photo={user.image} width={40} height={40} />
                      <span>
                        {user.firstName} {user.lastName}
                      </span>
                    </label>
                  ));
                })()}
              </div>
            )}
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleTrigger}
            variant="outline"
            className="flex w-full items-center justify-end rounded-md border-2 border-gray-500 p-2"
          >
            {showUsers ? (
              <ChevronUp className="text-[#797979]" />
            ) : (
              <ChevronDown className="text-[#797979]" />
            )}
          </Button>
        )}
      </div>
    </>
  );
}

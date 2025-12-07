import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import React, { useEffect, useRef, useState } from "react";
import { Group, User } from "@prisma/client";
import { createGroup } from "@/actions/communication/internal/creategroup";
import { useSession } from "next-auth/react";
import Avatar from "@/components/Avatar";
import { useDebounce } from "@/hooks/useDebounce";
import { searchUsers } from "@/actions/communication/internal/searchUser";
import { ChevronDown, ChevronUp, CircleX, Search, Users } from "lucide-react";

type TProps = {
  users: User[];
  setSideBarGroupLists: React.Dispatch<
    React.SetStateAction<Array<Group & { users: User[] }>>
  >;
  addChatItem?: (item: any, type: "user" | "group") => void;
};

type TContactListUser = {
  id: number;
  name: string;
};

export default function CreateGroupModal({
  users,
  setSideBarGroupLists,
  addChatItem,
}: TProps) {
  const [groupUsers, setGroupUsers] = useState(users);

  const { data: session }: { data: any } = useSession();

  const [open, setOpen] = useState(false);

  const [openUserList, setOpenUserList] = useState(false);

  const [groupName, setGroupName] = useState("");

  const [contactList, setContactList] = useState<Array<TContactListUser>>([]);

  const [error, setError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  }, [openUserList]);

  useEffect(() => {
    if (!open) {
      setContactList([]);
      setGroupName("");
      setGroupUsers(users);
      setOpenUserList(false);
      setError(null);
      setIsLoading(false);
    }
  }, [open]);

  const getFindUsers = async (searchTerm?: string) => {
    const searchUsersResult = await searchUsers(
      searchTerm || "",
      contactList.map((user) => ({
        id: user.id,
      }))
    );
    if (searchUsersResult.success) {
      setGroupUsers(searchUsersResult.data);
    } else {
      setGroupUsers(users);
    }
  };

  // search user handler
  const handleSearch = useDebounce(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const searchTerm = event.target.value;
      getFindUsers(searchTerm);
    },
    500
  );

  // add user in contact list
  // const handleAddContactList = (user: User) => {
  //   const modifyUser = {
  //     id: user.id,
  //     name: user.firstName + " " + user.lastName,
  //   };
  //   setGroupUsers((prevContact) =>
  //     prevContact.filter((prevUser) => prevUser.id !== user.id)
  //   );

  //   setError(null);
  //   setContactList((prev) => [...prev, modifyUser]);
  //   setOpenUserList(false);
  // };

  const handleAddContactList = (user: User) => {
    const name = user.firstName + " " + user.lastName;

    const alreadyExists = contactList.some((u) => u.name === name);
    if (alreadyExists) {
      setError(`User "${name}" is already in the contact list.`);
      return;
    }

    const modifyUser = {
      id: user.id,
      name,
    };

    setGroupUsers((prevContact) =>
      prevContact.filter((prevUser) => prevUser.id !== user.id)
    );

    setError(null);
    setContactList((prev) => [...prev, modifyUser]);
    setOpenUserList(false);
  };

  const handleDeleteFromContactList = (user: TContactListUser) => {
    setGroupUsers((prevUser) => [
      ...prevUser,
      users.find((u) => u.id === user.id)!,
    ]);
    setContactList((prev) =>
      prev.filter((prevUser) => prevUser.id !== user.id)
    );
  };

  const handleCreateGroup = async () => {
    if (groupName.trim() === "") {
      setError("Group name is required.");
      return;
    }

    if (contactList.length >= 2) {
      setIsLoading(true);
      try {
        const usersInGroup = contactList.map((user) => ({
          id: user.id,
        }));
        const response = await createGroup({
          name: groupName,
          users: [{ id: session?.user.id }, ...usersInGroup],
        });
        if (response.status === 200) {
          setOpen(false);
          setError("");
          setGroupName("");
          setContactList([]);
          setSideBarGroupLists((prevGroups) => {
            const isExistInGroup = prevGroups.find(
              (g) => g.id === response.data.id
            );
            if (!isExistInGroup) {
              return [...prevGroups, response.data];
            } else {
              return prevGroups;
            }
          });

          // Automatically open the newly created group in message box
          // If there are already 4 message boxes open, this will replace the last one (4th position)
          if (addChatItem) {
            addChatItem(response.data, "group");
          }
        } else {
          setError("Failed to create group.");
        }
      } catch (error) {
        setError("Failed to create group.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("At least 2 users are required to create a group.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Primary CTA Button: Uses a striking gradient and subtle lift on hover */}
        <button className="relative rounded-xl bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-3 py-1.5 transition-all duration-300 ease-in-out hover:scale-[1.05] hover:shadow-lg hover:shadow-teal-500/50">
          <Users className="size-5 text-white" />
          <span className="text-white absolute right-1 top-0 text-sm font-bold">
            +
          </span>
        </button>
      </DialogTrigger>
      {/* Dialog Content: The main modal body with glassmorphism effect */}
      <DialogContent className="w-[90vw] max-w-md rounded-2xl bg-background  ">
        {error && (
          <p className="text-center text-sm text-rose-500 dark:text-rose-400">
            {error}
          </p>
        )}
        {/* Title */}
        <h2 className="mb-5 text-2xl font-bold text-slate-800 dark:text-white">
          Create Group 
        </h2>
        <div className="grid grid-cols-1">
          {/* group name input */}
          <SlimInput
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              if (e.target.value.trim() !== "") {
                setError(null);
              }
            }}
            label="Group name"
            name="groupName"
            type="text"
            className="w-full text-slate-600 dark:text-white"
            placeholder="Add a group name..."
          />
        </div>
        {/* Contact List Selector / User List */}
        <div>
          {openUserList ? (
            <>
              {/* Header for open user list */}
              <div className="mb-1 mt-4 px-2 font-medium text-slate-800 dark:text-white">
                Select Contacts
              </div>
              {/* User search and list container (Glassmorphism card effect) */}
              <div className="w-full space-y-4 rounded-xl border border-slate-300/50 bg-white/50 p-4 backdrop-blur-sm max-h-[50vh] overflow-y-auto ring-1 ring-slate-900/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:ring-white/10 sm:max-h-[60vh]">
                {/* Search box with subtle styling */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    onChange={handleSearch}
                    type="text"
                    placeholder="Search users..."
                    className="w-full rounded-lg border border-slate-300/70 bg-white/80 py-1 pl-9 pr-8 leading-6 outline-none transition-colors duration-300 ease-in-out placeholder:text-slate-400 focus:border-[#00b8b0] dark:border-slate-700 dark:bg-slate-700 dark:text-white dark:focus:border-[#0098da]"
                  />
                  {/* Icon for closing the list */}
                  <ChevronUp
                    onClick={() => setOpenUserList((prev) => !prev)}
                    className="absolute right-1 top-1/2 size-6 -translate-y-1/2 cursor-pointer text-slate-600 transition-transform duration-300 ease-in-out hover:scale-110 dark:text-slate-400"
                  />
                  <Search className="absolute left-2 top-1/2 size-5 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                </div>
                {/* user list */}
                <div className="flex flex-col items-start space-y-2 overflow-y-auto p-1">
                  {groupUsers.length > 0 ? (
                    groupUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex w-full cursor-pointer items-center space-x-3 rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                        onClick={() => handleAddContactList(user)}
                      >
                        {/* Avatar remains simple and functional */}
                        <Avatar photo={user.image} width={60} height={60} />
                        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                          <p className="truncate text-base font-semibold text-slate-800 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          {/* Details with muted text color */}
                          <div className="flex flex-col md:flex-row md:items-center md:space-x-3 text-[8px] md:text-xs text-slate-600 dark:text-slate-400">
                            {user.phone && <p>{user.phone}</p>}
                            <p className="truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="w-full text-center text-amber-500">
                      No user found
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="relative mt-4">
              {/* Contact List closed state - uses SlimInput for consistent form look */}
              <SlimInput
                label="Contact List"
                name="ContactList"
                type="text"
                readOnly
                onClick={() => {
                  setOpenUserList((prev) => !prev);
                  getFindUsers();
                }}
                className="cursor-pointer text-slate-600 dark:text-white"
                rootClassName="overflow-hidden"
                placeholder="Click to add users..."
              />
              {/* Icon for opening the list */}
              <ChevronDown
                onClick={() => {
                  setOpenUserList((prev) => !prev);
                  getFindUsers();
                }}
                className="absolute right-1 top-[32px] size-6 cursor-pointer text-slate-600 transition-transform duration-300 ease-in-out hover:scale-110 dark:text-slate-400"
              />
              {/* added user in group list (Pill-style tags) */}
              <div className="mt-3 flex max-h-[250px] flex-wrap gap-3 overflow-y-auto rounded-lg p-2">
                {contactList.map((groupUser) => (
                  <div
                    key={groupUser.id}
                    className="group flex items-center justify-between space-x-1 rounded-full bg-[#6571FF] px-3 py-1 text-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#5a67e8] hover:shadow-indigo-500/50"
                  >
                    <p className="text-sm font-medium">{groupUser.name}</p>
                    {/* Delete icon with micro-interaction */}
                    <CircleX
                      onClick={() => handleDeleteFromContactList(groupUser)}
                      className="size-4 cursor-pointer text-white/80 transition-colors duration-300 ease-in-out group-hover:text-white"
                    />
                  </div>
                ))}
                {contactList.length === 0 && (
                  <p className="text-sm italic text-slate-500 dark:text-slate-400">
                    Click above to add users to the group.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Footer with action buttons */}
        <DialogFooter className="flex-row-reverse gap-x-3 sm:gap-x-0">
          {/* Cancel Button: Secondary action, simple design */}
          <DialogClose
            className="rounded-xl border-2 border-slate-300 p-2 text-slate-700 transition-colors duration-300 ease-in-out hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </DialogClose>
          {/* Create Group Button: Special action color with loading state and shimmer effect on hover */}
          <button
            onClick={handleCreateGroup}
            disabled={isLoading}
            className={`
              relative flex items-center justify-center gap-2 rounded-xl border border-[#6571FF] px-5 py-2 text-white transition-all duration-300 ease-in-out overflow-hidden
              ${
                isLoading
                  ? "cursor-not-allowed bg-slate-400 border-slate-400"
                  : "bg-[#6571FF] hover:bg-[#5a67e8] hover:shadow-lg hover:shadow-indigo-500/50"
              }
            `}
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isLoading ? "Creating..." : "Create Group"}
            {/* Shimmer effect for non-loading state */}
            {!isLoading && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 animate-shimmer"></span>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

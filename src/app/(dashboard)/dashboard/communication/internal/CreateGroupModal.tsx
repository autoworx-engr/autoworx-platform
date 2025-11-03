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
        <button className="relative rounded-md bg-gradient-to-r from-teal-700 to-teal-600 px-2 py-0.5 pr-3">
          <Users className="size-5 text-white fill-current" />
          <span className="text-white absolute right-1 top-0 text-sm ">+</span>
        </button>
      </DialogTrigger>
      <DialogContent className="w-[350px] sm:w-full">
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
        <h2 className="mb-5 text-2xl font-bold">Create Group</h2>
        <div className="grid grid-cols-1">
          {/* group name */}
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
            className="w-full"
          />
        </div>
        <div>
          {openUserList ? (
            <>
              <div className="mb-1 px-2 font-medium">Contact List</div>
              <div className="w-full space-y-4 rounded-md border border-gray-500 p-4 max-h-[50vh] overflow-y-auto sm:max-h-[60vh]">
                {/* Search box */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    onChange={handleSearch}
                    type="text"
                    className="w-full rounded-sm border border-primary-foreground bg-background py-0.5 pl-7 leading-6 outline-none"
                  />
                  <ChevronUp
                    onClick={() => setOpenUserList((prev) => !prev)}
                    className="absolute right-0 top-[5px] size-6 cursor-pointer"
                  />
                  <Search className="absolute left-1 top-[5px] size-5 cursor-pointer" />
                </div>
                {/* user list */}
                <div className="flex h-72 flex-col items-start space-y-2 overflow-y-auto p-1">
                  {groupUsers.length > 0 ? (
                    groupUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex cursor-pointer items-center space-x-2 p-1"
                        onClick={() => handleAddContactList(user)}
                      >
                        <Avatar photo={user.image} width={60} height={60} />
                        <div className="flex flex-col overflow-hidden">
                          <p className="text-sm font-bold">
                            {user.firstName} {user.lastName}
                          </p>

                          <div className="flex items-center space-x-3 text-[10px]">
                            {user.phone && <p>{user.phone}</p>}
                            <p>{user.email}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="w-full text-center text-red-300">
                      No user found
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="relative">
              <SlimInput
                label="Contact List"
                name="ContactList"
                type="text"
                readOnly
                onClick={() => {
                  setOpenUserList((prev) => !prev);
                  getFindUsers();
                }}
                className="cursor-pointer"
              />
              <ChevronDown
                onClick={() => {
                  setOpenUserList((prev) => !prev);
                  getFindUsers();
                }}
                className="absolute right-1 top-[32px] size-6 cursor-pointer"
              />
              {/* added user in group */}
              <div className="mt-3 flex flex-wrap gap-3 max-h-[250px] overflow-y-auto">
                {contactList.map((groupUser) => (
                  <div
                    key={groupUser.id}
                    className="flex items-center justify-between space-x-1 rounded-full bg-[#006D77] px-2 py-1 text-white"
                  >
                    <p className="text-sm">{groupUser.name}</p>
                    <CircleX
                      onClick={() => handleDeleteFromContactList(groupUser)}
                      className="size-5 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex-row-reverse gap-x-2 sm:gap-x-0">
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <button
            onClick={handleCreateGroup}
            disabled={isLoading}
            className={`rounded-lg border px-5 py-2 text-white flex items-center gap-2 ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#6571FF] hover:bg-[#5a67e8]"
            }`}
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isLoading ? "Creating..." : "Add"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import React, { useEffect, useRef, useState } from "react";
import { User } from "@prisma/client";
import Avatar from "@/components/Avatar";
import { useDebounce } from "@/hooks/useDebounce";
import { searchUsers } from "@/actions/communication/internal/searchUser";
import { addUserInGroup } from "@/actions/communication/internal/addUserInGroup";
import {
  ChevronDown,
  ChevronUp,
  CirclePlus,
  CircleX,
  Search,
} from "lucide-react";

import { successToast } from "@/lib/toast";

type TProps = {
  users: User[];
  groupId: number | undefined;
  setGroupsList: React.Dispatch<React.SetStateAction<any[]>> | null;
};

type TContactListUser = {
  id: number;
  name: string;
};

export default function AddUsersInGroupModal({
  users,
  groupId,
  setGroupsList,
}: TProps) {
  const [groupUsers, setGroupUsers] = useState(users);

  const [open, setOpen] = useState(false);

  const [openUserList, setOpenUserList] = useState(false);

  const [contactList, setContactList] = useState<Array<TContactListUser>>([]);

  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  }, [openUserList]);

  useEffect(() => {
    if (!open) {
      setContactList([]);
      setGroupUsers([]);
      setOpenUserList(false);
      setError(null);
    }
  }, [open]);

  const getFindUsers = async (searchTerm?: string) => {
    const withoutContactList = contactList.map((user) => ({
      id: user.id,
    }));
    const alreadyAddedUsersInGroup = users.map((user) => ({
      id: user.id,
    }));
    const searchUsersResult = await searchUsers(
      searchTerm || "",
      withoutContactList.concat(alreadyAddedUsersInGroup)
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
  const handleAddContactList = (user: User) => {
    const modifyUser = {
      id: user.id,
      name: user.firstName + " " + user.lastName,
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

  const handleAddUserInGroup = async () => {
    if (contactList.length !== 0 && groupId) {
      const usersInGroup = contactList.map((user) => ({
        id: user.id,
      }));
      const response = await addUserInGroup({
        groupId,
        users: usersInGroup,
      });
      if (response.status === 200) {
        setOpen(false);
        setError("");
        setContactList([]);
        setGroupsList &&
          setGroupsList((groupList) =>
            groupList.map((g) => {
              if (g.id === groupId) {
                return response.data;
              }
              return g;
            })
          );

        successToast("Users added to the group successfully!")
      } else {
        setError("Failed to create group.");
      }
    } else {
      setError("At least 2 users are required to create a group.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative rounded-xl bg-[#006D77] px-3 pt-1 pb-1.5 transition-all duration-300 ease-in-out hover:scale-[1.05] hover:shadow-lg hover:shadow-teal-500/50">
          <span className="text-sm font-medium text-white">Add Users</span>
          <CirclePlus className="ml-2 inline-block size-5 text-white" />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-md rounded-2xl bg-background">
        {error && (
          <p className="text-center text-sm text-rose-500 dark:text-rose-400">
            {error}
          </p>
        )}
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Add Users
        </h2>
        <div className="flex max-h-[250px] flex-wrap gap-3 overflow-y-auto rounded-lg p-2">
          {contactList.map((groupUser) => (
            <div
              key={groupUser.id}
              className="group flex items-center justify-between space-x-1 rounded-full bg-[#6571FF] px-3 py-1 text-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#5a67e8] hover:shadow-indigo-500/50"
            >
              <p className="text-sm">{groupUser.name}</p>
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
        <div>
          {openUserList ? (
            <>
              <div className="mb-1 px-2 font-medium text-slate-800 dark:text-white">
                Select Contacts
              </div>
              <div className="w-full space-y-4 rounded-xl border border-slate-300/50 bg-white/50 p-4 backdrop-blur-sm max-h-[50vh] overflow-y-auto ring-1 ring-slate-900/5 dark:border-slate-700/50 dark:bg-slate-800/50 dark:ring-white/10 sm:max-h-[60vh]">
                <div className="relative">
                  <input
                    ref={inputRef}
                    onChange={handleSearch}
                    type="text"
                    placeholder="Search users..."
                    className="w-full rounded-lg border border-slate-300/70 bg-white/80 py-1 pl-9 pr-8 leading-6 outline-none transition-colors duration-300 ease-in-out placeholder:text-slate-400 focus:border-[#00b8b0] dark:border-slate-700 dark:bg-slate-700 dark:text-white dark:focus:border-[#0098da]"
                  />
                  <ChevronUp
                    onClick={() => setOpenUserList((prev) => !prev)}
                    className="absolute right-1 top-1/2 size-6 -translate-y-1/2 cursor-pointer text-slate-600 transition-transform duration-300 ease-in-out hover:scale-110 dark:text-slate-400"
                  />
                  <Search className="absolute left-2 top-1/2 size-5 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="max-h-60 flex flex-col items-start space-y-2 overflow-y-auto thin-scrollbar p-1">
                  {groupUsers.length > 0 ? (
                    groupUsers.map((user) => (
                      <div
                        key={user?.id}
                        className="flex w-full cursor-pointer items-center space-x-3 rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                        onClick={() => handleAddContactList(user)}
                      >
                        <Avatar photo={user?.image} width={60} height={60} />
                        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                          <p className="truncate max-w-[280px] text-xs md:text-base font-semibold text-slate-800 dark:text-white">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <div className="flex flex-col text-[8px] md:text-xs text-slate-600 dark:text-slate-400">
                            {user?.phone && <p>{user?.phone}</p>}
                            <p className="truncate">{user?.email}</p>
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
            <div className="relative">
              <SlimInput
                label={
                  <>
                    Contact List <span className="text-red-500">*</span>
                  </>
                }
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
              <ChevronDown
                onClick={() => {
                  setOpenUserList((prev) => !prev);
                  getFindUsers();
                }}
                className="absolute right-1 top-9 size-6 cursor-pointer text-slate-500 transition-transform duration-300 ease-in-out hover:scale-110 dark:text-slate-400"
              />

            </div>
          )}
        </div>
        <DialogFooter className="gap-x-3">
          <DialogClose
            className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
          >
            Cancel
          </DialogClose>
          <button
            onClick={handleAddUserInGroup}
            className="
              relative flex items-center justify-center gap-2 rounded-xl border border-[#6571FF] px-5 py-2 text-white transition-all duration-300 ease-in-out overflow-hidden
              bg-[#6571FF] hover:bg-[#5a67e8] hover:shadow-lg hover:shadow-indigo-500/50
            "
          >
            Add
            <span className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 animate-shimmer"></span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

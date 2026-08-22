import { addUserInGroup } from "@/actions/communication/internal/addUserInGroup";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { successToast } from "@/lib/toast";
import { Group, User } from "@prisma/client";
import { CirclePlus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ContactPicker } from "./_components/ContactPicker";
import { useGroupContactInfiniteList } from "./_hooks/useGroupContactInfiniteList";

type TGroup = Group & { users: User[] };

type TProps = {
  users: User[];
  groupId: number | undefined;
  setGroupsList: React.Dispatch<React.SetStateAction<TGroup[]>> | null;
};

export default function AddUsersInGroupModal({
  users,
  groupId,
  setGroupsList,
}: TProps) {
  const [open, setOpen] = useState(false);
  const [openUserList, setOpenUserList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const existingIds = users.map((u) => u.id);
  const {
    groupUsers,
    contactList,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingUsers,
    handleSearch,
    addToContactList,
    removeFromContactList,
    reset,
  } = useGroupContactInfiniteList([], existingIds);

  useEffect(() => {
    if (!open) {
      reset();
      setOpenUserList(false);
      setError(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAdd = (user: User) => {
    const result = addToContactList(user);
    if (!result.ok) setError(`User is already in the contact list.`);
    else setError(null);
  };

  const handleAddUserInGroup = async () => {
    if (contactList.length === 0 || !groupId) {
      setError("Select at least one user.");
      return;
    }
    setIsLoading(true);
    try {
      const usersInGroup = contactList.map((u) => ({ id: u.id }));
      const response = await addUserInGroup({ groupId, users: usersInGroup });
      if (response.status === 200 && response.data) {
        setOpen(false);
        setError(null);
        setGroupsList?.((groupList) =>
          groupList.map((g) => (g.id === groupId ? response.data! : g)),
        );
        successToast("Users added to the group successfully!");
      } else {
        setError(response.message || "Failed to add users.");
      }
    } finally {
      setIsLoading(false);
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
        <ContactPicker
          contactList={contactList}
          groupUsers={groupUsers}
          openUserList={openUserList}
          setOpenUserList={setOpenUserList}
          onSearch={handleSearch}
          onAdd={handleAdd}
          onRemove={removeFromContactList}
          onOpenList={() => {
            setOpenUserList((p) => !p);
          }}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoadingUsers}
          required
        />
        <DialogFooter className="gap-x-3">
          <DialogClose className="rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors border">
            Cancel
          </DialogClose>
          <button
            onClick={handleAddUserInGroup}
            disabled={isLoading || contactList.length === 0}
            className={`relative flex items-center justify-center gap-2 rounded-xl border border-primary px-5 py-2 text-white transition-all duration-300 ease-in-out overflow-hidden ${
              isLoading || contactList.length === 0
                ? "cursor-not-allowed bg-slate-400 border-slate-400"
                : "bg-primary hover:bg-[#5a67e8] hover:shadow-lg hover:shadow-indigo-500/50"
            }`}
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            {isLoading ? "Adding..." : "Add"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

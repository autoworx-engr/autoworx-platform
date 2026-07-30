import { createGroup } from "@/actions/communication/internal/creategroup";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import { GROUP_NAME_MAX_LENGTH } from "@/lib/utils/groupName";
import { Group, User } from "@prisma/client";
import { Users } from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { ContactPicker } from "./_components/ContactPicker";
import { useGroupContactInfiniteList } from "./_hooks/useGroupContactInfiniteList";

type TGroup = Group & { users: User[] };

type TProps = {
  users: User[];
  existingGroups: TGroup[];
  setSideBarGroupLists: React.Dispatch<React.SetStateAction<TGroup[]>>;
  addChatItem?: (item: TGroup, type: "user" | "group") => void;
};

export default function CreateGroupModal({
  users,
  existingGroups,
  setSideBarGroupLists,
  addChatItem,
}: TProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [openUserList, setOpenUserList] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
  } = useGroupContactInfiniteList(users);

  useEffect(() => {
    if (!open) {
      reset();
      setGroupName("");
      setOpenUserList(false);
      setError(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAdd = (user: User) => {
    const result = addToContactList(user);
    if (!result.ok) {
      setError(
        `User "${user.firstName} ${user.lastName}" is already in the contact list.`,
      );
    } else {
      setError(null);
    }
  };

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim().replace(/\s+/g, " ");
    if (!trimmedName) {
      setError("Group name is required.");
      return;
    }
    const normalize = (s: string) =>
      s.trim().replace(/\s+/g, " ").toLowerCase();
    if (
      existingGroups.some(
        (g) => normalize(g.name ?? "") === normalize(trimmedName),
      )
    ) {
      setError("Group name already exists.");
      return;
    }
    if (contactList.length < 2) {
      setError("At least 2 users are required to create a group.");
      return;
    }

    setIsLoading(true);
    try {
      const usersInGroup = contactList.map((u) => ({ id: u.id }));
      const response = await createGroup({
        name: trimmedName,
        users: [{ id: Number(session?.user?.id) }, ...usersInGroup],
      });

      if (response.status === 200 && response.data) {
        const createdGroup = response.data;
        setOpen(false);
        setError(null);
        setGroupName("");
        setSideBarGroupLists((prev) =>
          prev.find((g) => g.id === createdGroup.id)
            ? prev
            : [...prev, createdGroup],
        );
        addChatItem?.(createdGroup, "group");
      } else if (response.status === 409) {
        setError(response.message || "Group name already exists.");
      } else {
        setError(response.message || "Failed to create group.");
      }
    } catch {
      setError("Failed to create group.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative rounded-xl bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-3 py-1.5 transition-all duration-300 ease-in-out hover:scale-[1.05] hover:shadow-lg hover:shadow-teal-500/50">
          <Users className="size-5 text-white" />
          <span className="text-white absolute right-1 top-0 text-sm font-bold">
            +
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-[90vw] max-w-md rounded-2xl bg-background"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {error && (
          <p className="text-center text-sm text-rose-500 dark:text-rose-400">
            {error}
          </p>
        )}
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Create Group
        </h2>
        <div className="grid grid-cols-1">
          <SlimInput
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              if (e.target.value.trim() !== "") setError(null);
            }}
            label={
              <>
                Group name <span className="text-red-500">*</span>
              </>
            }
            name="groupName"
            type="text"
            maxLength={GROUP_NAME_MAX_LENGTH}
            className="w-full text-slate-600 dark:text-white"
            placeholder="Add a Group Name..."
          />
        </div>

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
            onClick={handleCreateGroup}
            disabled={isLoading}
            className={`relative flex items-center justify-center gap-2 rounded-xl border border-primary px-5 py-2 text-white transition-all duration-300 ease-in-out overflow-hidden ${
              isLoading
                ? "cursor-not-allowed bg-slate-400 border-slate-400"
                : "bg-primary hover:bg-[#5a67e8] hover:shadow-lg hover:shadow-indigo-500/50"
            }`}
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            {isLoading ? "Creating..." : "Create Group"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

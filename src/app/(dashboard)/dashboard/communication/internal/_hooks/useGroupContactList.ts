import { searchUsers } from "@/actions/communication/internal/searchUser";
import { useDebounce } from "@/hooks/useDebounce";
import { User } from "@prisma/client";
import React, { useState } from "react";

export type TContactListUser = { id: number; name: string };

/**
 * Shared state machine for "pick users into a contact list" used by both the
 * Create Group and Add Users modals. Owns:
 *   - the searched-user pool
 *   - the current contact-list selection
 *   - debounced search against the server action
 *   - add / remove helpers that keep both lists in sync
 */
export function useGroupContactList(
  initialUsers: User[],
  excludeIds: number[] = [],
) {
  const [groupUsers, setGroupUsers] = useState<User[]>(initialUsers);
  const [contactList, setContactList] = useState<TContactListUser[]>([]);

  const fetchUsers = async (searchTerm = "") => {
    const exclude = [...contactList.map((u) => u.id), ...excludeIds];
    const result = await searchUsers(searchTerm, exclude);
    setGroupUsers(result.success ? (result.data as User[]) : initialUsers);
  };

  const handleSearch = useDebounce(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      fetchUsers(event.target.value),
    500,
  );

  const addToContactList = (
    user: User,
  ): { ok: true } | { ok: false; reason: "duplicate" } => {
    // Dedup by id so two employees who happen to share the same first + last
    // name can both be added; only re-adding the *same account* is blocked.
    if (contactList.some((u) => u.id === user.id)) {
      return { ok: false, reason: "duplicate" };
    }
    const name = `${user.firstName} ${user.lastName}`;
    setGroupUsers((prev) => prev.filter((u) => u.id !== user.id));
    setContactList((prev) => [...prev, { id: user.id, name }]);
    return { ok: true };
  };

  const removeFromContactList = (user: TContactListUser) => {
    const original = initialUsers.find((u) => u.id === user.id);
    if (original) {
      setGroupUsers((prev) => [...prev, original]);
    }
    setContactList((prev) => prev.filter((u) => u.id !== user.id));
  };

  const reset = () => {
    setContactList([]);
    setGroupUsers(initialUsers);
  };

  return {
    groupUsers,
    setGroupUsers,
    contactList,
    setContactList,
    fetchUsers,
    handleSearch,
    addToContactList,
    removeFromContactList,
    reset,
  };
}

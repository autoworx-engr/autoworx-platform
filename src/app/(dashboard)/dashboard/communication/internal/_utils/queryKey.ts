/**
 * React-query keys for the internal communication module. Mirror of
 * `client/_utils/queryKey.ts`. All keys live under the `internal` namespace
 * so they can be invalidated as a group from `queryClient.invalidateQueries`.
 */
export const internalKeys = {
  /** Sidebar users list. Search term participates in the key so changing it
   *  resets the infinite query without hand-rolled pagination resets. */
  users: (companyId: number, search: string = "") =>
    ["internal", "users", companyId, search] as const,

  /** Sidebar groups list. Same shape as `users` — search resets pagination. */
  groups: (companyId: number, search: string = "") =>
    ["internal", "groups", companyId, search] as const,

  /** Direct-message thread between two specific users. */
  userMessages: (currentUserId: number, otherUserId: number) =>
    ["internal", "user-messages", currentUserId, otherUserId] as const,

  /** Group-chat thread for a single group. */
  groupMessages: (groupId: number) =>
    ["internal", "group-messages", groupId] as const,
};

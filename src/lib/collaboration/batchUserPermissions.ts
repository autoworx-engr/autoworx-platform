import { getUserPermissions } from "@/actions/settings/teamManagement";

type UserKey = { id: number; employeeType: string };

/**
 * Batches getUserPermissions calls so each unique (userId, employeeType) pair
 * is looked up exactly once per request. Returns a Map keyed by userId.
 *
 * Replaces the N+1 pattern where getUserPermissions was called inside nested
 * Promise.all maps across companies × users.
 */
export async function batchUserPermissions(
  users: UserKey[],
): Promise<Map<number, Awaited<ReturnType<typeof getUserPermissions>>>> {
  const seen = new Map<number, UserKey>();
  for (const u of users) {
    if (!seen.has(u.id)) seen.set(u.id, u);
  }

  const unique = Array.from(seen.values());
  const entries = await Promise.all(
    unique.map(async (u) => {
      try {
        const perms = await getUserPermissions(u.id, u.employeeType);
        return [u.id, perms] as const;
      } catch {
        return [u.id, {}] as const;
      }
    }),
  );

  return new Map(entries);
}

export function hasCollaborationPermission(
  perms: Awaited<ReturnType<typeof getUserPermissions>> | undefined,
): boolean {
  return (
    !!perms &&
    typeof perms === "object" &&
    "communicationHubCollaboration" in perms &&
    perms.communicationHubCollaboration === true
  );
}

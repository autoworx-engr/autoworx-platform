"use client";

import { canAccessWithPermissionKey } from "@/lib/routeAccess";
import type { PermissionKey } from "@/lib/routePermissionKeys";
import { usePermissionStore } from "@/stores/permissionStore";

/**
 * Action-level permission check, for gating controls *inside* a page the user is
 * already allowed to open — e.g. a role with view-only Inventory can reach the
 * vendor list but must not see Add / Edit / Delete.
 *
 * Use `useCanAccessRoute` when the question is "may they open this page?"; use
 * this when it is "may they change this thing?".
 */
export function useHasPermissionKey(
  key: PermissionKey | PermissionKey[],
): boolean {
  const { permissions } = usePermissionStore();
  return canAccessWithPermissionKey(key, permissions);
}

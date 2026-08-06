"use client";

import { canAccessRoute, canAccessWithFeatureKey } from "@/lib/routeAccess";
import { resolveRouteFeatureKey } from "@/lib/routeFeatureKeys";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { usePermissionStore } from "@/stores/permissionStore";

/**
 * Client-side "can this user open this route?" — the same two checks
 * `PrivateRoute` runs, in the same order (company entitlement, then user
 * permission), so an action button can never offer a link that 404s.
 *
 * Use this for buttons/links that navigate into a guarded subtree; the route
 * itself is enforced by `requireRouteAccess` on the server.
 */
export function useCanAccessRoute(route: string): boolean {
  const { permissions } = usePermissionStore();
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();

  return (
    canAccessWithFeatureKey(
      resolveRouteFeatureKey(route),
      companyFeaturePermission,
    ) && canAccessRoute(route, permissions)
  );
}

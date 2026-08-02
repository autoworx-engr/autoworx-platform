// canAccessRoute.ts
import { PermissionsResult } from "@/lib/getPermissions";
import {
  dynamicSuperAdminRoutes,
  resolveRoutePermissionKey,
  SUPER_ADMIN_ROUTES_PERMISSIONS_MAP,
} from "./routePermissionsMap";
import type { RoutePermissionKey } from "./routePermissionKeys";
import type { RouteFeatureKey } from "./routeFeatureKeys";
import type { CompanyFeaturePermission } from "@/stores/companyFeaturePermissionStore";

/**
 * Company permission takes priority: the company must allow the key, and when
 * per-user permissions exist the user must allow it too.
 */
function hasPermissionKey(
  key: string,
  permissions: PermissionsResult,
): boolean {
  const hasCompanyPermission = Boolean(
    //@ts-ignore
    permissions.companyPermissions?.[key],
  );
  if (hasCompanyPermission && permissions?.userPermissions) {
    //@ts-ignore
    return Boolean(permissions.userPermissions?.[key]);
  }
  return hasCompanyPermission;
}

/**
 * Access check driven by a permission key instead of a route. Use this when the
 * key is already known (e.g. precomputed on the generated search registry) so no
 * route → key lookup is needed at runtime.
 *
 * Note: super-admin-only routes are not covered here — use `canAccessRoute` for those.
 */
export function canAccessWithPermissionKey(
  permissionKey: RoutePermissionKey,
  permissions: PermissionsResult | null,
): boolean {
  if (!permissions) return true;
  if (permissions.role === "Admin") return true;

  // Unguarded route
  if (!permissionKey) return true;

  // If the map defines multiple possible keys, any of them grants access
  if (Array.isArray(permissionKey)) {
    return permissionKey.some((key) => hasPermissionKey(key, permissions));
  }

  return hasPermissionKey(permissionKey, permissions);
}

/**
 * Company feature-entitlement check driven by a feature key instead of a route.
 * An empty/unloaded entitlement list allows everything, matching PrivateRoute.
 */
export function canAccessWithFeatureKey(
  featureKey: RouteFeatureKey,
  companyFeaturePermission: CompanyFeaturePermission[] | null | undefined,
): boolean {
  if (!companyFeaturePermission || companyFeaturePermission.length === 0) {
    return true;
  }

  // Route has no route-level feature gate
  if (!featureKey) return true;

  const isEnabled = (key: string) =>
    companyFeaturePermission.some(
      (perm) => perm.permission_name === key && perm.enabled,
    );

  if (Array.isArray(featureKey)) return featureKey.some(isEnabled);

  return isEnabled(featureKey);
}

export function canAccessRoute(
  route: string,
  permissions: PermissionsResult | null,
): boolean {
  const routeWithoutQuery = route.split("?")[0];
  if (!permissions) return true;
  const superAdmin = permissions.isSuperAdmin ? "superAdmin" : "";
  const isSuperAdminRoute =
    SUPER_ADMIN_ROUTES_PERMISSIONS_MAP[routeWithoutQuery] ??
    dynamicSuperAdminRoutes(routeWithoutQuery);

  // Only allow if both are 'superAdmin'
  if (isSuperAdminRoute === "superAdmin" && superAdmin === "superAdmin") {
    return true;
  }
  if (permissions.role === "Admin" && isSuperAdminRoute !== "superAdmin") {
    return true;
  }
  //stripe the query string
  const permissionKey = resolveRoutePermissionKey(routeWithoutQuery);

  // If not found in the map, default to allow or block:
  if (!permissionKey && !isSuperAdminRoute) return true;

  if (route === "/") return true;

  // A super-admin-only route reached here means the user is not a super admin
  if (isSuperAdminRoute === "superAdmin") return false;

  return canAccessWithPermissionKey(permissionKey, permissions);
}

import { superAdminNavList } from "@/app/(dashboard)/awx-dashboard/_utils/superAdminNavList";

// Route → user-permission keys and route → company feature keys live in
// dependency-free modules so build-time scripts can import them; re-exported
// here to keep existing import sites working.
export {
  ROUTE_PERMISSIONS_MAP,
  resolveRoutePermissionKey,
} from "./routePermissionKeys";
export type { PermissionKey, RoutePermissionKey } from "./routePermissionKeys";

export {
  FEATURE_PERMISSIONS_MAP,
  resolveRouteFeatureKey,
} from "./routeFeatureKeys";
export type { CompanyFeatureKey, RouteFeatureKey } from "./routeFeatureKeys";

/** Root of the platform super-admin area. */
export const SUPER_ADMIN_ROUTE_PREFIX = "/awx-dashboard";

function getSuperAdminPermissionMap() {
  const superAdminPermissionMap = {} as Record<string, "superAdmin">;
  superAdminNavList.forEach((superAdminNav) => {
    if (superAdminNav.path) {
      superAdminPermissionMap[superAdminNav.path] = "superAdmin";
    }
    // `link` can differ from `path` (e.g. path /awx-dashboard/reporting but
    // link /awx-dashboard/reporting/revenue) — register both.
    if (superAdminNav.link) {
      superAdminPermissionMap[superAdminNav.link] = "superAdmin";
    }
    if (superAdminNav.subnav) {
      superAdminNav.subnav.forEach((subNav) => {
        superAdminPermissionMap[subNav.link] = "superAdmin";
      });
    }
  });
  return superAdminPermissionMap;
}

export const SUPER_ADMIN_ROUTES_PERMISSIONS_MAP: Record<string, "superAdmin"> =
  getSuperAdminPermissionMap();

/**
 * Every route under /awx-dashboard is super-admin only. Matching on the prefix
 * rather than on superAdminNavList entries keeps pages that are not in the nav
 * (plans, webhook events, bug/churn reports, /statistics/:id) closed to company
 * Admins instead of falling through to the "Admin can do anything" branch.
 */
export function isSuperAdminOnlyRoute(route: string): boolean {
  const routeWithoutQuery = route.split("?")[0];
  return (
    routeWithoutQuery === SUPER_ADMIN_ROUTE_PREFIX ||
    routeWithoutQuery.startsWith(`${SUPER_ADMIN_ROUTE_PREFIX}/`)
  );
}

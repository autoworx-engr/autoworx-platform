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

function getSuperAdminPermissionMap() {
  const superAdminPermissionMap = {} as Record<string, "superAdmin">;
  superAdminNavList.forEach((superAdminNav) => {
    if (superAdminNav.path) {
      superAdminPermissionMap[superAdminNav.path] = "superAdmin";
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

export const dynamicSuperAdminRoutes = function (route: string) {
  const dynamicRoute = ["/awx-dashboard/statistics/:id"];
  const formattedDynamicRoute = dynamicRoute.reduce((acc, pattern) => {
    const params = extractPathParams(pattern, route);
    if (params) {
      acc = "superAdmin";
    }
    return acc;
  }, "" as string);
  return formattedDynamicRoute;
};

function extractPathParams(pattern: string, path: string) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const routePart = patternParts[i];
    const pathPart = pathParts[i];

    if (routePart.startsWith(":")) {
      const paramName = routePart.slice(1);
      params[paramName] = pathPart;
    } else if (routePart !== pathPart) {
      return null; // not a match
    }
  }

  return params;
}

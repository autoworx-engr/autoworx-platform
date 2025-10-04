// canAccessRoute.ts
import { PermissionsResult } from "@/lib/getPermissions";
import {
  dynamicSuperAdminRoutes,
  ROUTE_PERMISSIONS_MAP,
  SUPER_ADMIN_ROUTES_PERMISSIONS_MAP,
} from "./routePermissionsMap";

export function canAccessRoute(
  route: string,
  permissions: PermissionsResult | null
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
  const permissionKey = ROUTE_PERMISSIONS_MAP[routeWithoutQuery];

  // If not found in the map, default to allow or block:
  if (!permissionKey && !isSuperAdminRoute) return true;

  if (route === "/") return true;
  // If the map defines multiple possible keys, check any of them
  if (Array.isArray(permissionKey)) {
    const hasDbPermission = permissionKey.some((key) => {
      //@ts-ignore
      const hasCompanyPermission = Boolean(
        //@ts-ignore
        permissions.companyPermissions?.[key]
      );
      if (hasCompanyPermission && permissions?.userPermissions) {
        //@ts-ignore
        return Boolean(permissions.userPermissions?.[key]);
      }
      return hasCompanyPermission;
    });
    return hasDbPermission;
  }

  // Single permission key

  const hasCompanyPermission = Boolean(
    //@ts-ignore
    permissions.companyPermissions?.[permissionKey]
  );
  if (hasCompanyPermission && permissions?.userPermissions) {
    //@ts-ignore
    return Boolean(permissions.userPermissions?.[permissionKey]);
  }
  return hasCompanyPermission;
}

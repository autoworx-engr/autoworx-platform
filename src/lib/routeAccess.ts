// canAccessRoute.ts
import { PermissionsResult } from "@/lib/getPermissions";
import { ROUTE_PERMISSIONS_MAP } from "./routePermissionsMap";

export function canAccessRoute(
  route: string,
  permissions: PermissionsResult | null,
): boolean {
  if (!permissions) return true;
  if (permissions.role === "Admin") return true;
  if (route === "/") return true;
  //stripe the query string
  const routeWithoutQuery = route.split("?")[0];
  const permissionKey = ROUTE_PERMISSIONS_MAP[routeWithoutQuery];
  // If not found in the map, default to allow or block:
  if (!permissionKey) return true;

  // If the map defines multiple possible keys, check any of them
  if (Array.isArray(permissionKey)) {
    const hasDbPermission = permissionKey.some((key) => {
      //@ts-ignore
      return Boolean(permissions.companyPermissions?.[key]);
    });

    return hasDbPermission;
  }

  // Single permission key
  const hasSinglePermission = Boolean(
    //@ts-ignore
    permissions.companyPermissions?.[permissionKey],
  );

  return hasSinglePermission;
}

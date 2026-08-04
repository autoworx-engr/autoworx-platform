/**
 * Route → user-permission key mapping.
 *
 * Every key here MUST be a real boolean column on the Prisma permission models
 * (Permission / PermissionForManager / PermissionForSales /
 * PermissionForTechnician / PermissionForOther) — `canAccessRoute` reads them
 * by name off `companyPermissions` / `userPermissions`, so a key that does not
 * exist in the schema silently resolves to `false` for every non-Admin role.
 *
 * Kept free of imports so build-time scripts (scripts/generate-search-registry.ts)
 * can consume it without pulling in app/React modules.
 */

export type PermissionKey =
  | "communicationHubInternal"
  | "communicationHubClients"
  | "communicationHubCollaboration"
  | "estimatesInvoices"
  | "calendarTask"
  | "payments"
  | "workforceManagement"
  | "reporting"
  | "inventoryAll"
  | "integrations"
  | "salesPipeline"
  | "shopPipeline"
  | "businessSettings"
  | "workforceManagementViewOnly"
  | "reportingViewOnly"
  | "inventoryAllViewOnly"
  | "visualization";

export type RoutePermissionKey = PermissionKey | PermissionKey[] | undefined;

export const ROUTE_PERMISSIONS_MAP: Record<string, RoutePermissionKey> = {
  "/dashboard/communication/client": "communicationHubClients",
  "/dashboard/communication/collaboration": "communicationHubCollaboration",
  "/dashboard/communication/internal": "communicationHubInternal",
  "/dashboard/inventory": ["inventoryAllViewOnly", "inventoryAll"],
  "/dashboard/inventory/vendor": "inventoryAll",
  "/dashboard/inventory/camera": "inventoryAll",
  "/dashboard/estimate": "estimatesInvoices",
  "/dashboard/payments": "payments",
  "/dashboard/task/day": "calendarTask",
  "/dashboard/workforce": "workforceManagement",
  "/dashboard/reporting/revenue": ["reporting", "reportingViewOnly"],
  "/dashboard/reporting/workforce": "workforceManagementViewOnly",
  "/dashboard/integrations": "integrations",
  "/dashboard/pipeline/sales/pipeline": "salesPipeline",
  "/dashboard/pipeline/sales/lead": "salesPipeline",
  "/dashboard/pipeline/shop/pipeline": "shopPipeline",
  "/dashboard/pipeline/shop/workorder": "shopPipeline",
  "/dashboard/visualization": "visualization",
  "/dashboard/settings": "businessSettings",
  "/dashboard/settings/team-management": "businessSettings",
  "/dashboard/settings/payments": "businessSettings",
  "/dashboard/settings/estimates": "businessSettings",
  "/dashboard/settings/communications": "businessSettings",
  "/dashboard/settings/security": "businessSettings",
  "/dashboard/settings/business": "businessSettings",
  "/dashboard/settings/networks": "businessSettings",
  "/dashboard/settings/billing": "businessSettings",
  "/dashboard/settings/leadgeneration": "businessSettings",
  "/dashboard/settings/automation": "businessSettings",
  "/dashboard/settings/calendar": "businessSettings",
  "/dashboard/settings/sales-agent": "businessSettings",
};

/**
 * Route subtrees whose child pages inherit the parent's permission key.
 *
 * Opt-in per subtree rather than a blanket "nearest mapped ancestor" fallback:
 * without this, /dashboard/estimate is guarded by `estimatesInvoices` while
 * /dashboard/estimate/invoices, /create, /canned and /templates stay reachable
 * by anyone. A route with its own ROUTE_PERMISSIONS_MAP entry always wins.
 */
const ROUTE_PERMISSION_PREFIXES: [string, RoutePermissionKey][] = [
  ["/dashboard/estimate", "estimatesInvoices"],
];

/**
 * Resolve the permission key(s) guarding a route. Query strings are stripped
 * first, so "/dashboard/reporting/revenue?view=revenue" resolves like the bare
 * path. Returns `undefined` for unguarded routes.
 */
export function resolveRoutePermissionKey(route: string): RoutePermissionKey {
  const routeWithoutQuery = route.split("?")[0];

  const exactKey = ROUTE_PERMISSIONS_MAP[routeWithoutQuery];
  if (exactKey) return exactKey;

  return ROUTE_PERMISSION_PREFIXES.find(
    ([prefix]) =>
      routeWithoutQuery === prefix ||
      routeWithoutQuery.startsWith(`${prefix}/`),
  )?.[1];
}

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
  | "teamPipeline"
  | "businessSettings"
  | "workforceManagementViewOnly"
  | "reportingViewOnly"
  | "inventoryAllViewOnly"
  | "clientDirectory"
  | "employeeDirectory"
  | "fleetDirectory"
  | "visualization";

/** An array means "any of these keys grants access". */
export type RoutePermissionKey = PermissionKey | PermissionKey[] | undefined;

/**
 * Subtrees reserved for company Admins (and platform super admins), gated by
 * role rather than by a togglable module permission — there is deliberately no
 * team-management switch for these. The company feature entitlement still
 * applies on top, so Virtual Shop needs `virtual-shop` enabled as well.
 */
const ADMIN_ONLY_ROUTE_PREFIXES = ["/dashboard/virtual-shop"];

/**
 * Personal settings pages. Every /dashboard/settings route is gated by
 * `businessSettings`, except these — they are each user's own account screens.
 */
const ALWAYS_OPEN_ROUTE_PREFIXES = [
  "/dashboard/settings/my-account",
  "/dashboard/settings/notifications",
];

function matchesPrefix(route: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

export function isAdminOnlyRoute(route: string): boolean {
  return matchesPrefix(route.split("?")[0], ADMIN_ONLY_ROUTE_PREFIXES);
}

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
  "/dashboard/reporting/workforce": [
    "workforceManagement",
    "workforceManagementViewOnly",
  ],
  "/dashboard/integrations": "integrations",
  "/dashboard/pipeline/sales/pipeline": "salesPipeline",
  "/dashboard/pipeline/sales/lead": "salesPipeline",
  "/dashboard/pipeline/shop/pipeline": "shopPipeline",
  "/dashboard/pipeline/shop/workorder": "shopPipeline",
  "/dashboard/pipeline/team/pipeline": "teamPipeline",
  "/dashboard/pipeline/team/workorder": "teamPipeline",
  "/dashboard/visualization": "visualization",
  "/dashboard/client": "clientDirectory",
  "/dashboard/employee": "employeeDirectory",
  "/dashboard/fleet": "fleetDirectory",
  // Every /dashboard/settings page is covered by the ROUTE_PERMISSION_PREFIXES
  // entry below — Business Settings gates the lot.
};

/**
 * Route subtrees whose child pages inherit the parent's permission key.
 *
 * Opt-in per subtree rather than a blanket "nearest mapped ancestor" fallback:
 * without this, /dashboard/estimate is guarded by `estimatesInvoices` while
 * /dashboard/estimate/invoices, /create, /canned and /templates stay reachable
 * by anyone. A route with its own ROUTE_PERMISSIONS_MAP entry always wins, and
 * the first matching prefix wins, so keep the more specific ones first.
 */
const ROUTE_PERMISSION_PREFIXES: [string, RoutePermissionKey][] = [
  // Whole settings area, minus ALWAYS_OPEN_ROUTE_PREFIXES. A new settings page
  // is therefore gated by default rather than open by default.
  ["/dashboard/settings", "businessSettings"],
  ["/dashboard/estimate", "estimatesInvoices"],
  ["/dashboard/communication/client", "communicationHubClients"],
  ["/dashboard/communication/internal", "communicationHubInternal"],
  ["/dashboard/communication/collaboration", "communicationHubCollaboration"],
  ["/dashboard/task", "calendarTask"],
  ["/dashboard/reporting", ["reporting", "reportingViewOnly"]],
  ["/dashboard/pipeline/sales", "salesPipeline"],
  ["/dashboard/pipeline/shop", "shopPipeline"],
  ["/dashboard/pipeline/team", "teamPipeline"],
  ["/dashboard/pipeline", ["salesPipeline", "shopPipeline", "teamPipeline"]],
  ["/dashboard/inventory", ["inventoryAll", "inventoryAllViewOnly"]],
  ["/dashboard/client", "clientDirectory"],
  ["/dashboard/employee", "employeeDirectory"],
  ["/dashboard/fleet", "fleetDirectory"],
];

/**
 * Resolve the permission key(s) guarding a route. Query strings are stripped
 * first, so "/dashboard/reporting/revenue?view=revenue" resolves like the bare
 * path. Returns `undefined` for unguarded routes.
 */
export function resolveRoutePermissionKey(route: string): RoutePermissionKey {
  const routeWithoutQuery = route.split("?")[0];

  if (matchesPrefix(routeWithoutQuery, ALWAYS_OPEN_ROUTE_PREFIXES)) {
    return undefined;
  }

  const exactKey = ROUTE_PERMISSIONS_MAP[routeWithoutQuery];
  if (exactKey) return exactKey;

  return ROUTE_PERMISSION_PREFIXES.find(
    ([prefix]) =>
      routeWithoutQuery === prefix ||
      routeWithoutQuery.startsWith(`${prefix}/`),
  )?.[1];
}

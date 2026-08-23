/**
 * Route → company feature-entitlement mapping.
 *
 * Unlike route permission keys (see routePermissionKeys.ts), these are matched
 * against `permission_name` rows in the company feature-permission store, not
 * against Prisma columns — so the key set is dynamic rather than schema-bound.
 * Keys must therefore match `permission_name` values seeded from
 * `src/constants/static-permissions.ts`.
 *
 * Kept free of imports so build-time scripts (scripts/generate-search-registry.ts)
 * can consume it without pulling in app/React modules.
 */

export type CompanyFeatureKey =
  | "communicationHubInternal"
  | "communicationHubClients"
  | "communicationHubCollaboration"
  | "callingAccess"
  | "estimateInvoices"
  | "calendar"
  | "payments"
  | "invoicing"
  | "clientDirectory"
  | "employeeDirectory"
  | "fleetDirectory"
  | "reporting"
  | "inventory"
  | "integrations"
  | "shopPipeline"
  | "salesPipeline"
  | "teamPipeline"
  | "businessSettings"
  | "workforceManagement"
  | "serviceEstimator"
  | "automation"
  | "visualization"
  | "sales-agent"
  | "virtual-shop";

export type RouteFeatureKey =
  | CompanyFeatureKey
  | CompanyFeatureKey[]
  | undefined;

export const FEATURE_PERMISSIONS_MAP: Record<string, RouteFeatureKey> = {
  "/dashboard/communication/client": "communicationHubClients",
  "/dashboard/communication/collaboration": "communicationHubCollaboration",
  "/dashboard/communication/internal": "communicationHubInternal",
  "/dashboard/inventory": "inventory",
  "/dashboard/inventory/vendor": "inventory",
  "/dashboard/inventory/camera": "inventory",
  "/dashboard/estimate": "estimateInvoices",
  "/dashboard/payments": "payments",
  "/dashboard/task/day": "calendar",
  "/dashboard/workforce": "workforceManagement",
  "/dashboard/reporting/revenue": "reporting",
  "/dashboard/reporting/workforce": "workforceManagement",
  "/dashboard/integrations": "integrations",
  "/dashboard/pipeline/sales/pipeline": "salesPipeline",
  "/dashboard/pipeline/sales/lead": "salesPipeline",
  "/dashboard/pipeline/shop/pipeline": "shopPipeline",
  "/dashboard/visualization": "visualization",
  "/dashboard/pipeline/shop/workorder": "shopPipeline",
  "/dashboard/pipeline/team/pipeline": "teamPipeline",
  "/dashboard/pipeline/team/workorder": "teamPipeline",
  // These three settings pages are shown/hidden by their own product
  // entitlement — Virtual Shop, the Automation group and AI Sales Agent. Every
  // other settings page falls to the "/dashboard/settings" prefix below.
  "/dashboard/settings/virtual-shop-configure": "virtual-shop",
  "/dashboard/settings/automation": "automation",
  "/dashboard/settings/sales-agent": "sales-agent",
  "/dashboard/client": "clientDirectory",
  "/dashboard/employee": "employeeDirectory",
  "/dashboard/fleet": "fleetDirectory",
  "/dashboard/virtual-shop": "virtual-shop",
};

/**
 * Routes that are NOT feature-gated at the route level even though they have a
 * FEATURE_PERMISSIONS_MAP entry — they are gated inside the page/API via
 * entitlements so the user sees an upgrade prompt instead of a 404 redirect.
 */
function isEntitlementGatedRoute(routeWithoutQuery: string): boolean {
  return (
    routeWithoutQuery === "/dashboard/visualization" ||
    // Personal account screens — must stay reachable no matter what the
    // company has enabled. Mirrors ALWAYS_OPEN_ROUTE_PREFIXES.
    routeWithoutQuery.startsWith("/dashboard/settings/my-account") ||
    routeWithoutQuery.startsWith("/dashboard/settings/notifications")
  );
}

/**
 * Route subtrees whose child pages inherit the parent's feature key — see
 * ROUTE_PERMISSION_PREFIXES in routePermissionKeys.ts for the rationale.
 * A route with its own FEATURE_PERMISSIONS_MAP entry always wins, and the first
 * matching prefix wins, so keep the more specific ones first.
 */
const ROUTE_FEATURE_PREFIXES: [string, RouteFeatureKey][] = [
  ["/dashboard/settings/virtual-shop-configure", "virtual-shop"],
  ["/dashboard/settings/automation", "automation"],
  ["/dashboard/settings/sales-agent", "sales-agent"],
  ["/dashboard/settings", "businessSettings"],
  ["/dashboard/estimate", "estimateInvoices"],
  ["/dashboard/communication/client", "communicationHubClients"],
  ["/dashboard/communication/internal", "communicationHubInternal"],
  ["/dashboard/communication/collaboration", "communicationHubCollaboration"],
  ["/dashboard/task", "calendar"],
  ["/dashboard/reporting", "reporting"],
  ["/dashboard/pipeline/sales", "salesPipeline"],
  ["/dashboard/pipeline/shop", "shopPipeline"],
  ["/dashboard/pipeline/team", "teamPipeline"],
  ["/dashboard/pipeline", ["salesPipeline", "shopPipeline", "teamPipeline"]],
  ["/dashboard/inventory", "inventory"],
  ["/dashboard/client", "clientDirectory"],
  ["/dashboard/employee", "employeeDirectory"],
  ["/dashboard/fleet", "fleetDirectory"],
  ["/dashboard/virtual-shop", "virtual-shop"],
];

/**
 * Resolve the company feature key(s) guarding a route. Query strings are
 * stripped first. Returns `undefined` for routes with no route-level gate.
 */
export function resolveRouteFeatureKey(route: string): RouteFeatureKey {
  const routeWithoutQuery = route.split("?")[0];
  if (isEntitlementGatedRoute(routeWithoutQuery)) return undefined;

  const exactKey = FEATURE_PERMISSIONS_MAP[routeWithoutQuery];
  if (exactKey) return exactKey;

  return ROUTE_FEATURE_PREFIXES.find(
    ([prefix]) =>
      routeWithoutQuery === prefix ||
      routeWithoutQuery.startsWith(`${prefix}/`),
  )?.[1];
}

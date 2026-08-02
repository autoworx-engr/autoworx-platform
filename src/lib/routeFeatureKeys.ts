/**
 * Route → company feature-entitlement mapping.
 *
 * Unlike route permission keys (see routePermissionKeys.ts), these are matched
 * against `permission_name` rows in the company feature-permission store, not
 * against Prisma columns — so the key set is dynamic rather than schema-bound.
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
  "/dashboard/settings": "businessSettings",
  "/dashboard/settings/team-management": "businessSettings",
  "/dashboard/settings/automation": "automation",
  "/dashboard/settings/virtual-shop-configure": "virtual-shop",
  "/dashboard/settings/sales-agent": "sales-agent",
  "/dashboard/settings/payments": "businessSettings",
  "/dashboard/settings/estimates": "businessSettings",
  "/dashboard/settings/communications": "businessSettings",
  "/dashboard/settings/security": "businessSettings",
  "/dashboard/settings/business": "businessSettings",
  "/dashboard/settings/networks": "businessSettings",
  "/dashboard/settings/billing": "businessSettings",
  "/dashboard/settings/leadgeneration": "businessSettings",
  "/dashboard/settings/calendar": "businessSettings",
  "/dashboard/client": "clientDirectory",
  "/dashboard/employee": "employeeDirectory",
  "/dashboard/fleet": "fleetDirectory",
};

/**
 * Routes that are NOT feature-gated at the route level even though they have a
 * FEATURE_PERMISSIONS_MAP entry — they are gated inside the page/API via
 * entitlements so the user sees an upgrade prompt instead of a 404 redirect.
 */
function isEntitlementGatedRoute(routeWithoutQuery: string): boolean {
  return (
    routeWithoutQuery === "/dashboard/visualization" ||
    routeWithoutQuery.startsWith("/dashboard/settings/sales-agent")
  );
}

/**
 * Route subtrees whose child pages inherit the parent's feature key — see
 * ROUTE_PERMISSION_PREFIXES in routePermissionKeys.ts for the rationale.
 * A route with its own FEATURE_PERMISSIONS_MAP entry always wins.
 */
const ROUTE_FEATURE_PREFIXES: [string, RouteFeatureKey][] = [
  ["/dashboard/estimate", "estimateInvoices"],
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

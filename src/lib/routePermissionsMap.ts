import { superAdminNavList } from "@/app/(dashboard)/awx-dashboard/_utils/superAdminNavList";

type PermissionKeys =
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

export const ROUTE_PERMISSIONS_MAP: Record<
  string,
  PermissionKeys | PermissionKeys[] | undefined
> = {
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
  "/dashboard/settings/ai-train": "businessSettings",
};

type CompanyFeaturePermissionKeys =
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
  | "sales-agent";

export const FEATURE_PERMISSIONS_MAP: Record<
  string,
  CompanyFeaturePermissionKeys | CompanyFeaturePermissionKeys[] | undefined
> = {
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
  "/dashboard/settings/ai-train": "sales-agent",
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

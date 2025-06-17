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
  | "inventoryAllViewOnly";

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
  "/dashboard/calendar": "calendarTask",
  "/dashboard/workforce": "workforceManagement",
  "/dashboard/reporting/revenue": ["reporting", "reportingViewOnly"],
  "/dashboard/reporting/workforce": "workforceManagementViewOnly",
  "/dashboard/integrations": "integrations",
  "/dashboard/pipeline/sales/pipeline": "salesPipeline",
  "/dashboard/pipeline/sales/lead": "salesPipeline",
  "/dashboard/pipeline/shop/pipeline": "shopPipeline",
  "/dashboard/pipeline/shop/workorder": "shopPipeline",
  "/dashboard/settings": "businessSettings",
  "/dashboard/settings/team-management": "businessSettings",
  "/dashboard/settings/payments": "businessSettings",
  "/dashboard/settings/estimates": "businessSettings",
  "/dashboard/settings/communications": "businessSettings",
  "/dashboard/settings/security": "businessSettings",
};

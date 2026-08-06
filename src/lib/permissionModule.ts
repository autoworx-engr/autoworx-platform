/**
 * Team-management module catalogue.
 *
 * Every `key` / `viewOnly` value MUST be a real boolean column on the matching
 * Prisma permission model, because the team-management screens write
 * `{ [field]: value }` straight through to Prisma and `canAccessRoute` reads
 * them back by name. A key with no column silently reads as `false`.
 *
 * `viewOnly` means "this role only has the view-only column for the module" —
 * the module's own column does not exist on that role's model, so the
 * view-only field is the one control the admin gets.
 */
export interface PermissionModule {
  label: string;
  key: string;
  viewOnly?: string;
}

export type PermissionRole = "Manager" | "Sales" | "Technician" | "Other";

// Deliberately absent, with their columns left dormant in the schema:
//   * Virtual Shop  — /dashboard/virtual-shop is Admin / super-admin only
//     (ADMIN_ONLY_ROUTE_PREFIXES) plus the `virtual-shop` company feature.
//   * Automation / AI Sales Agent — their settings pages are covered by
//     Business Settings like every other /dashboard/settings page.

export const permissionModuleForAdminManager: PermissionModule[] = [
  { label: "Communications Hub: Internal", key: "communicationHubInternal" },
  { label: "Communications Hub: Clients", key: "communicationHubClients" },
  {
    label: "Communications Hub: Collaboration",
    key: "communicationHubCollaboration",
  },
  { label: "Estimates & Invoices", key: "estimatesInvoices" },
  { label: "Calendar & Task", key: "calendarTask" },
  { label: "Payments", key: "payments" },
  { label: "Directory: Clients", key: "clientDirectory" },
  { label: "Directory: Employees", key: "employeeDirectory" },
  { label: "Directory: Fleet", key: "fleetDirectory" },
  { label: "Workforce Management", key: "workforceManagement" },
  { label: "Reporting & Analytics", key: "reporting" },
  { label: "Inventory", key: "inventoryAll" },
  { label: "Integrations", key: "integrations" },
  { label: "Sales Pipeline", key: "salesPipeline" },
  { label: "Shop Pipeline", key: "shopPipeline" },
  { label: "Team Pipeline", key: "teamPipeline" },
  { label: "Visualization", key: "visualization" },
  { label: "Business Settings", key: "businessSettings" },
];

export const permissionModuleForSales: PermissionModule[] = [
  { label: "Communications Hub: Internal", key: "communicationHubInternal" },
  { label: "Communications Hub: Clients", key: "communicationHubClients" },
  {
    label: "Communications Hub: Collaboration",
    key: "communicationHubCollaboration",
  },
  { label: "Estimates & Invoices", key: "estimatesInvoices" },
  { label: "Calendar & Task", key: "calendarTask" },
  { label: "Payments", key: "payments" },
  { label: "Directory: Clients", key: "clientDirectory" },
  { label: "Directory: Employees", key: "employeeDirectory" },
  { label: "Directory: Fleet", key: "fleetDirectory" },
  {
    label: "Workforce Management",
    key: "workforceManagement",
    viewOnly: "workforceManagementViewOnly",
  },
  {
    label: "Reporting & Analytics",
    key: "reporting",
    viewOnly: "reportingViewOnly",
  },
  { label: "Inventory", key: "inventoryAll", viewOnly: "inventoryAllViewOnly" },
  { label: "Sales Pipeline", key: "salesPipeline" },
  { label: "Team Pipeline", key: "teamPipeline" },
  { label: "Visualization", key: "visualization" },
];

export const permissionModuleForTechnician: PermissionModule[] = [
  { label: "Communications Hub: Internal", key: "communicationHubInternal" },
  { label: "Calendar & Task", key: "calendarTask" },
  { label: "Directory: Clients", key: "clientDirectory" },
  { label: "Directory: Employees", key: "employeeDirectory" },
  { label: "Directory: Fleet", key: "fleetDirectory" },
  {
    label: "Workforce Management",
    key: "workforceManagement",
    viewOnly: "workforceManagementViewOnly",
  },
  {
    label: "Reporting & Analytics",
    key: "reporting",
    viewOnly: "reportingViewOnly",
  },
  { label: "Shop Pipeline", key: "shopPipeline" },
  { label: "Team Pipeline", key: "teamPipeline" },
];

export const permissionModuleForOther: PermissionModule[] = [
  { label: "Communications Hub: Internal", key: "communicationHubInternal" },
  { label: "Communications Hub: Clients", key: "communicationHubClients" },
  {
    label: "Communications Hub: Collaboration",
    key: "communicationHubCollaboration",
  },
  { label: "Estimates & Invoices", key: "estimatesInvoices" },
  { label: "Calendar & Task", key: "calendarTask" },
  { label: "Payments", key: "payments" },
  { label: "Directory: Clients", key: "clientDirectory" },
  { label: "Directory: Employees", key: "employeeDirectory" },
  { label: "Directory: Fleet", key: "fleetDirectory" },
  // PermissionForOther has the full columns, not the view-only variants.
  { label: "Workforce Management", key: "workforceManagement" },
  { label: "Reporting & Analytics", key: "reporting" },
  { label: "Inventory", key: "inventoryAll" },
  { label: "Integrations", key: "integrations" },
  { label: "Sales Pipeline", key: "salesPipeline" },
  { label: "Shop Pipeline", key: "shopPipeline" },
  { label: "Team Pipeline", key: "teamPipeline" },
  { label: "Visualization", key: "visualization" },
  { label: "Business Settings", key: "businessSettings" },
];

export const rolePermissionModules: Record<PermissionRole, PermissionModule[]> =
  {
    Manager: permissionModuleForAdminManager,
    Sales: permissionModuleForSales,
    Technician: permissionModuleForTechnician,
    Other: permissionModuleForOther,
  };

/** Row order for the default-roles matrix — the Manager list is the superset. */
export const permissionModuleRows = permissionModuleForAdminManager;

/**
 * The module entry a role actually has, or `undefined` when the module does not
 * apply to that role (rendered as "—" in the roles matrix).
 */
export function getRoleModule(
  role: string,
  moduleKey: string,
): PermissionModule | undefined {
  const modules = rolePermissionModules[role as PermissionRole];
  return modules?.find((module) => module.key === moduleKey);
}

/**
 * Permission columns a role is allowed to have written. Used to keep the
 * team-management server actions from mass-assigning arbitrary client-supplied
 * field names into Prisma.
 */
export function permissionFieldsForRole(role: string): Set<string> {
  // Admin has no model of its own — it is stored against the Manager row.
  const modules =
    rolePermissionModules[
      (role === "Admin" ? "Manager" : role) as PermissionRole
    ];
  const fields = new Set<string>();
  modules?.forEach((module) => {
    fields.add(module.viewOnly ?? module.key);
  });
  return fields;
}

export function getModuleLabel(moduleKey: string): string {
  return (
    permissionModuleRows.find((module) => module.key === moduleKey)?.label ??
    moduleKey
  );
}

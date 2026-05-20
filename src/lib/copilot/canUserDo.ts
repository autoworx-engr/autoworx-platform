import getPermissions, { type PermissionsResult } from "@/lib/getPermissions";

export type CopilotAction =
  | "lead.create"
  | "lead.update"
  | "lead.read"
  | "appointment.create"
  | "appointment.update"
  | "appointment.read"
  | "task.create"
  | "task.update"
  | "task.read"
  | "estimate.create"
  | "estimate.add_materials"
  | "estimate.read"
  | "estimate.send"
  | "invoice.send"
  | "invoice.read"
  | "inventory.create"
  | "inventory.update"
  | "inventory.read"
  | "report.revenue.read"
  | "report.payments.read"
  | "client.read"
  | "client.create"
  | "vehicle.read"
  | "vehicle.create";

export type PermissionContext = {
  userId: number;
  companyId: number;
};

/**
 * Safely reads a named boolean field from companyPermissions across all role
 * variants. PermissionForTechnician lacks several fields that other roles have,
 * so direct property access fails the union type check.
 */
function cp(p: PermissionsResult, field: string): boolean | null | undefined {
  const perms = p.companyPermissions as Record<
    string,
    boolean | null | undefined
  > | null;
  return perms?.[field];
}

/**
 * Maps copilot action strings to the AWX permission fields they require.
 * Follows the existing two-layer resolution: Admin role bypasses all checks;
 * other roles fall back from userPermissions → companyPermissions.
 *
 * Source of truth for the mapping: docs/copilot/TOOL_REGISTRY.md
 * (canUserDo Permission Mapping section).
 */
const PERMISSION_MAP: Record<
  CopilotAction,
  { check: (p: PermissionsResult) => boolean; reason: string }
> = {
  "lead.create": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.salesPipeline ?? cp(p, "salesPipeline")),
    reason: "You don't have permission to create leads (salesPipeline).",
  },
  "lead.update": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.salesPipeline ?? cp(p, "salesPipeline")),
    reason: "You don't have permission to update leads (salesPipeline).",
  },
  "lead.read": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.salesPipeline ?? cp(p, "salesPipeline")),
    reason: "You don't have permission to view the sales pipeline.",
  },
  "appointment.create": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.calendarTask ?? cp(p, "calendarTask")),
    reason: "You don't have permission to create appointments (calendarTask).",
  },
  "appointment.update": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.calendarTask ?? cp(p, "calendarTask")),
    reason: "You don't have permission to update appointments (calendarTask).",
  },
  "appointment.read": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.calendarTask ?? cp(p, "calendarTask")),
    reason: "You don't have permission to view appointments.",
  },
  "task.create": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.calendarTask ?? cp(p, "calendarTask")),
    reason: "You don't have permission to create tasks (calendarTask).",
  },
  "task.update": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.calendarTask ?? cp(p, "calendarTask")),
    reason: "You don't have permission to update tasks (calendarTask).",
  },
  "task.read": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.calendarTask ?? cp(p, "calendarTask")),
    reason: "You don't have permission to view tasks.",
  },
  "estimate.create": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.estimatesInvoices ?? cp(p, "estimatesInvoices")),
    reason:
      "You don't have permission to create estimates (estimatesInvoices).",
  },
  "estimate.add_materials": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.estimatesInvoices ?? cp(p, "estimatesInvoices")),
    reason:
      "You don't have permission to modify estimates (estimatesInvoices).",
  },
  "estimate.read": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.estimatesInvoices ?? cp(p, "estimatesInvoices")),
    reason: "You don't have permission to view estimates.",
  },
  "estimate.send": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.estimatesInvoices ?? cp(p, "estimatesInvoices")),
    reason: "You don't have permission to send estimates (estimatesInvoices).",
  },
  "invoice.send": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.estimatesInvoices ?? cp(p, "estimatesInvoices")),
    reason: "You don't have permission to send invoices (estimatesInvoices).",
  },
  "invoice.read": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.estimatesInvoices ?? cp(p, "estimatesInvoices")),
    reason: "You don't have permission to view invoices.",
  },
  "inventory.create": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.inventoryAll ?? cp(p, "inventoryAll")),
    reason:
      "You don't have permission to create inventory items (inventoryAll).",
  },
  "inventory.update": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.inventoryAll ?? cp(p, "inventoryAll")),
    reason: "You don't have permission to update inventory (inventoryAll).",
  },
  "inventory.read": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.inventoryAll ?? cp(p, "inventoryAll")),
    reason: "You don't have permission to view inventory.",
  },
  "report.revenue.read": {
    // Uses !== false pattern — reporting defaults to allowed unless explicitly disabled
    check: (p) =>
      p.role === "Admin" ||
      (p.userPermissions?.reporting ?? cp(p, "reporting")) !== false,
    reason: "You don't have permission to view revenue reports (reporting).",
  },
  "report.payments.read": {
    // Payments permission defaults to true; check both userPermissions and companyPermissions
    check: (p) =>
      p.role === "Admin" ||
      (p.userPermissions?.payments ?? cp(p, "payments")) !== false,
    reason: "You don't have permission to view payment reports (payments).",
  },
  "client.read": {
    // All authenticated roles can read clients within their company
    check: () => true,
    reason: "",
  },
  "client.create": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.salesPipeline ?? cp(p, "salesPipeline")),
    reason: "You don't have permission to create clients (salesPipeline).",
  },
  "vehicle.read": {
    // All authenticated roles can read vehicle data within their company
    check: () => true,
    reason: "",
  },
  "vehicle.create": {
    check: (p) =>
      p.role === "Admin" ||
      !!(p.userPermissions?.salesPipeline ?? cp(p, "salesPipeline")),
    reason: "You don't have permission to add vehicles (salesPipeline).",
  },
};

/**
 * Check whether the given user is allowed to perform the copilot action.
 * Calls getPermissions() (which hits the DB) on every invocation — the
 * call site can cache if this becomes a bottleneck.
 *
 * Returns { allowed: true } or { allowed: false, reason: "<user-facing message>" }.
 */
export async function canUserDo(
  action: CopilotAction,
  context: PermissionContext,
): Promise<{ allowed: boolean; reason?: string }> {
  const permissions = await getPermissions(context.companyId, context.userId);

  if (!permissions) {
    return { allowed: false, reason: "Could not load your permissions." };
  }

  const entry = PERMISSION_MAP[action];
  const allowed = entry.check(permissions);

  return allowed ? { allowed: true } : { allowed: false, reason: entry.reason };
}

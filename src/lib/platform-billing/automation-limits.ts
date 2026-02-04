import type { Entitlements } from "@/lib/platform-billing/entitlement-service";

export function getAutomationLimitForModule(
  entitlements: Entitlements,
  moduleKey:
    | "pipeline"
    | "communication"
    | "invoice"
    | "inventory"
    | "tag"
    | "service"
    | "marketing",
): number {
  switch (moduleKey) {
    case "pipeline":
      return entitlements.automationLimitPipeline;
    case "communication":
      return entitlements.automationLimitCommunication;
    case "invoice":
      return entitlements.automationLimitInvoice;
    case "inventory":
      return entitlements.automationLimitInventory;
    case "tag":
      return entitlements.automationLimitTag;
    case "service":
      return entitlements.automationLimitService;
    case "marketing":
      return entitlements.automationLimitMarketing;
    default:
      return 0;
  }
}

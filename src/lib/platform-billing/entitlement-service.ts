"use server";

import { db } from "@/lib/db";
import {
  PlatformFeatureType,
  PlatformSubscriptionStatus,
} from "@prisma/client";
import {
  normalizeFeatureKey,
  parseFeatureValue,
} from "@/lib/platform-billing/entitlements";
import { getAutomationLimitForModule } from "@/lib/platform-billing/automation-limits";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Entitlements = {
  canUseVoice: boolean;
  canUseSms: boolean;
  callRecording: boolean;
  missedCallTextBack: boolean;
  automationModules: string[];
  automationLimitPipeline: number;
  automationLimitCommunication: number;
  automationLimitInvoice: number;
  automationLimitInventory: number;
  automationLimitTag: number;
  automationLimitService: number;
  automationLimitMarketing: number;
  websiteIncluded: boolean;
  carWrapVisualizer: boolean;
  aiSmartReplies: boolean;
  awxSalesAgent: boolean;
};

export type AutomationModuleKey =
  | "pipeline"
  | "communication"
  | "invoice"
  | "inventory"
  | "tag"
  | "service"
  | "marketing";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ENTITLEMENTS: Entitlements = {
  canUseVoice: false,
  canUseSms: false,
  callRecording: false,
  missedCallTextBack: false,
  automationModules: [],
  automationLimitPipeline: 0,
  automationLimitCommunication: 0,
  automationLimitInvoice: 0,
  automationLimitInventory: 0,
  automationLimitTag: 0,
  automationLimitService: 0,
  automationLimitMarketing: 0,
  websiteIncluded: false,
  carWrapVisualizer: false,
  aiSmartReplies: false,
  awxSalesAgent: false,
};

const LEGACY_ENTITLEMENTS: Entitlements = {
  canUseVoice: true,
  canUseSms: true,
  callRecording: true,
  missedCallTextBack: true,
  automationModules: [
    "pipeline",
    "communication",
    "invoice",
    "inventory",
    "tag",
    "service",
    "marketing",
  ],
  automationLimitPipeline: 3,
  automationLimitCommunication: 3,
  automationLimitInvoice: 3,
  automationLimitInventory: 3,
  automationLimitTag: 3,
  automationLimitService: 3,
  automationLimitMarketing: 3,
  websiteIncluded: true,
  carWrapVisualizer: true,
  aiSmartReplies: true,
  awxSalesAgent: true,
};

/** Companies that always get unlimited automation rules regardless of plan. */
const UNLIMITED_AUTOMATION_COMPANY_IDS = new Set([4, 14]);

/**
 * Maps CompanyPermissionModule.permission_name → the Entitlements key it overrides.
 * Admin toggling a permission ON/OFF takes precedence over the plan value.
 * To add a new override, just add an entry here — no other code changes needed.
 */
const FEATURE_PERMISSION_OVERRIDES: Record<string, keyof Entitlements> = {
  callingAccess: "canUseVoice",
  "sales-agent": "awxSalesAgent",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Applies admin feature-permission overrides on top of plan-derived entitlements.
 *  enabled = true  → grant the feature regardless of plan
 *  enabled = false → block the feature regardless of plan
 *  no record       → plan value is used as-is
 */
function withUnlimitedAutomation(entitlements: Entitlements): Entitlements {
  return {
    ...entitlements,
    automationLimitPipeline: -1,
    automationLimitCommunication: -1,
    automationLimitInvoice: -1,
    automationLimitInventory: -1,
    automationLimitTag: -1,
    automationLimitService: -1,
    automationLimitMarketing: -1,
  };
}

function applyFeaturePermissionOverrides(
  entitlements: Entitlements,
  permissions: { permission_name: string; enabled: boolean }[],
): Entitlements {
  const result = { ...entitlements };
  for (const perm of permissions) {
    const key = FEATURE_PERMISSION_OVERRIDES[perm.permission_name];
    if (key) {
      (result as Record<string, unknown>)[key] = perm.enabled;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves the current entitlements for a company.
 * TODO: Add Redis/memory cache to avoid DB hits on every request.
 */
export async function getCompanyEntitlements(
  companyId: number,
): Promise<Entitlements> {
  const id = Number(companyId);
  if (!id) return DEFAULT_ENTITLEMENTS;

  const isUnlimitedCompany = UNLIMITED_AUTOMATION_COMPANY_IDS.has(id);

  const permissionNames = Object.keys(FEATURE_PERMISSION_OVERRIDES);

  const [company, subscription, featurePerms] = await Promise.all([
    db.company.findUnique({
      where: { id },
      select: { enforcePlatformPlan: true },
    }),
    db.platformSubscription.findUnique({
      where: { companyId: id },
      include: { plan: { include: { features: true } } },
    }),
    db.companyPermissionModule.findMany({
      where: { companyId: id, permission_name: { in: permissionNames } },
      select: { permission_name: true, enabled: true },
    }),
  ]);

  if (company && !company.enforcePlatformPlan) {
    const legacy = applyFeaturePermissionOverrides(
      LEGACY_ENTITLEMENTS,
      featurePerms,
    );
    return isUnlimitedCompany ? withUnlimitedAutomation(legacy) : legacy;
  }

  if (
    !subscription ||
    !subscription.plan ||
    subscription.status === PlatformSubscriptionStatus.CANCELED ||
    subscription.status === PlatformSubscriptionStatus.UNPAID
  ) {
    const defaults = applyFeaturePermissionOverrides(
      DEFAULT_ENTITLEMENTS,
      featurePerms,
    );
    return isUnlimitedCompany ? withUnlimitedAutomation(defaults) : defaults;
  }

  // Build entitlements from plan features
  const entitlements: Entitlements = { ...DEFAULT_ENTITLEMENTS };

  for (const f of subscription.plan.features) {
    const key = normalizeFeatureKey(f.featureKey);

    if (f.type === PlatformFeatureType.TEXT && key === "automationModules") {
      entitlements.automationModules = f.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }

    (entitlements as Record<string, unknown>)[key] = parseFeatureValue(
      f.type,
      f.value,
    );
  }

  const resolved = applyFeaturePermissionOverrides(entitlements, featurePerms);
  return isUnlimitedCompany ? withUnlimitedAutomation(resolved) : resolved;
}

/** Returns true if the company has a specific entitlement. */
export async function hasFeature(
  companyId: number,
  feature: keyof Entitlements,
): Promise<boolean> {
  const ents = await getCompanyEntitlements(companyId);
  const val = ents[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  return false;
}

/** Returns true if the company can create another automation rule for the given module. */
export async function canAddAutomationRule(
  companyId: number,
  currentCount: number,
  moduleKey: AutomationModuleKey,
): Promise<boolean> {
  const ents = await getCompanyEntitlements(companyId);
  const limit = getAutomationLimitForModule(ents, moduleKey);
  return limit === -1 || currentCount < limit;
}

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
  automationLimitReporting: number;
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
  | "marketing"
  | "reporting";

type AutomationLimitKey =
  | "automationLimitPipeline"
  | "automationLimitCommunication"
  | "automationLimitInvoice"
  | "automationLimitInventory"
  | "automationLimitTag"
  | "automationLimitService"
  | "automationLimitMarketing"
  | "automationLimitReporting";

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
  automationLimitReporting: 0,
  websiteIncluded: false,
  carWrapVisualizer: false,
  aiSmartReplies: false,
  awxSalesAgent: false,
};

const AUTOMATION_LIMIT_KEY_BY_MODULE: Record<
  AutomationModuleKey,
  AutomationLimitKey
> = {
  pipeline: "automationLimitPipeline",
  communication: "automationLimitCommunication",
  invoice: "automationLimitInvoice",
  inventory: "automationLimitInventory",
  tag: "automationLimitTag",
  service: "automationLimitService",
  marketing: "automationLimitMarketing",
  reporting: "automationLimitReporting",
};

/**
 * Maps CompanyPermissionModule.permission_name → the Entitlements key it overrides.
 *
 * To add a new override, just add an entry here — no other code changes needed.
 */
const FEATURE_PERMISSION_OVERRIDES: Record<string, keyof Entitlements> = {
  communication: "canUseSms",
  callingAccess: "canUseVoice",
  aiSmartReplies: "aiSmartReplies",
  visualization: "carWrapVisualizer",
  "sales-agent": "awxSalesAgent",
};

const AUTOMATION_PERMISSION_TO_MODULE: Record<string, AutomationModuleKey> = {
  pipelineAutomation: "pipeline",
  communicationAutomation: "communication",
  invoiceAutomation: "invoice",
  inventoryAutomation: "inventory",
  tagAutomation: "tag",
  serviceAutomation: "service",
  marketingAutomation: "marketing",
  reportingAutomation: "reporting",
};

const LEGACY_UNLIMITED_AUTOMATION_COMPANY_IDS = new Set([4, 12, 14]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds entitlements from company feature-permission toggles only.
 * This is used for legacy-mode companies (enforcePlatformPlan = false).
 */
function buildEntitlementsFromFeaturePermissions(
  companyId: number,
  permissions: { permission_name: string; enabled: boolean }[],
): Entitlements {
  const result: Entitlements = { ...DEFAULT_ENTITLEMENTS };
  const enabledAutomationModules = new Set<AutomationModuleKey>();

  for (const perm of permissions) {
    const moduleKey = AUTOMATION_PERMISSION_TO_MODULE[perm.permission_name];
    if (moduleKey) {
      if (perm.enabled) enabledAutomationModules.add(moduleKey);
      continue;
    }

    const key = FEATURE_PERMISSION_OVERRIDES[perm.permission_name];
    if (!key) continue;
    (result as Record<string, unknown>)[key] = perm.enabled;
  }

  result.callRecording = true;
  result.automationModules = Array.from(enabledAutomationModules);
  const legacyAutomationLimit = LEGACY_UNLIMITED_AUTOMATION_COMPANY_IDS.has(
    companyId,
  )
    ? -1
    : 3;

  for (const moduleKey of Object.keys(
    AUTOMATION_LIMIT_KEY_BY_MODULE,
  ) as AutomationModuleKey[]) {
    const limitKey = AUTOMATION_LIMIT_KEY_BY_MODULE[moduleKey];
    result[limitKey] = enabledAutomationModules.has(moduleKey)
      ? legacyAutomationLimit
      : 0;
  }

  return result;
}

function buildEntitlementsFromPlanFeatures(
  features: {
    featureKey: string;
    type: PlatformFeatureType;
    value: string;
  }[],
): Entitlements {
  const base: Entitlements = { ...DEFAULT_ENTITLEMENTS };

  for (const feature of features) {
    const key = normalizeFeatureKey(feature.featureKey);

    if (
      feature.type === PlatformFeatureType.TEXT &&
      key === "automationModules"
    ) {
      base.automationModules = feature.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }

    if (key in base) {
      (base as Record<string, unknown>)[key] = parseFeatureValue(
        feature.type,
        feature.value,
      );
    }
  }

  return base;
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

  const company = await db.company.findUnique({
    where: { id },
    select: { enforcePlatformPlan: true },
  });

  const isLegacy = company ? !company.enforcePlatformPlan : false;

  // Legacy mode: use feature-permission toggles only.
  if (isLegacy) {
    const featurePerms = await db.companyPermissionModule.findMany({
      where: {
        companyId: id,
        permission_name: {
          in: [
            ...Object.keys(FEATURE_PERMISSION_OVERRIDES),
            ...Object.keys(AUTOMATION_PERMISSION_TO_MODULE),
          ],
        },
      },
      select: { permission_name: true, enabled: true },
    });
    return buildEntitlementsFromFeaturePermissions(id, featurePerms);
  }

  // Platform-plan mode: use subscription plan entitlements only.
  const subscription = await db.platformSubscription.findUnique({
    where: { companyId: id },
    include: { plan: { include: { features: true } } },
  });

  let base: Entitlements;
  if (
    !subscription ||
    !subscription.plan ||
    subscription.status === PlatformSubscriptionStatus.CANCELED ||
    subscription.status === PlatformSubscriptionStatus.UNPAID
  ) {
    return { ...DEFAULT_ENTITLEMENTS };
  }

  base = buildEntitlementsFromPlanFeatures(subscription.plan.features);
  return base;
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

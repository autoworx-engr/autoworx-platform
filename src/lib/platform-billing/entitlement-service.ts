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
  automationLimitPipeline: -1,
  automationLimitCommunication: -1,
  automationLimitInvoice: -1,
  automationLimitInventory: -1,
  automationLimitTag: -1,
  automationLimitService: -1,
  automationLimitMarketing: -1,
  websiteIncluded: true,
  carWrapVisualizer: true,
  aiSmartReplies: true,
  awxSalesAgent: true,
};

/**
 * Resolves the current entitlements for a company.
 * Caches results (TODO: Redis/Memory cache) to avoid DB hits on every request.
 */
export async function getCompanyEntitlements(
  companyId: number,
): Promise<Entitlements> {
  const id = Number(companyId);
  if (!id) return DEFAULT_ENTITLEMENTS;

  // Run all queries in parallel to avoid sequential round-trips
  const [company, subscription, callingPerm] = await Promise.all([
    db.company.findUnique({
      where: { id },
      select: { enforcePlatformPlan: true },
    }),
    db.platformSubscription.findUnique({
      where: { companyId: id },
      include: { plan: { include: { features: true } } },
    }),
    db.companyPermissionModule.findFirst({
      where: { companyId: id, permission_name: "callingAccess" },
      select: { enabled: true },
    }),
  ]);

  // Feature permission overrides plan for voice:
  //   enabled = true  → always grant canUseVoice
  //   enabled = false → always block canUseVoice
  //   no record       → let the plan decide
  const withCallingGate = (ents: Entitlements): Entitlements => {
    if (callingPerm?.enabled === true) return { ...ents, canUseVoice: true };
    if (callingPerm?.enabled === false) return { ...ents, canUseVoice: false };
    return ents;
  };

  if (company && !company.enforcePlatformPlan) {
    return withCallingGate(LEGACY_ENTITLEMENTS);
  }

  if (
    !subscription ||
    !subscription.plan ||
    subscription.status === PlatformSubscriptionStatus.CANCELED ||
    subscription.status === PlatformSubscriptionStatus.UNPAID
  ) {
    return withCallingGate(DEFAULT_ENTITLEMENTS);
  }

  const features = subscription.plan.features as {
    featureKey: string;
    value: string;
    type: PlatformFeatureType;
  }[];
  const entitlements: Entitlements = { ...DEFAULT_ENTITLEMENTS };

  features.forEach((f: any) => {
    const key = normalizeFeatureKey(f.featureKey);

    // Special handling: automationModules is stored as comma-separated TEXT
    if (f.type === PlatformFeatureType.TEXT && key === "automationModules") {
      entitlements.automationModules = f.value
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      return;
    }

    const parsed = parseFeatureValue(f.type, f.value);
    (entitlements as any)[key] = parsed;
  });

  return withCallingGate(entitlements);
}

/**
 * Fast check for a specific feature
 */
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

/**
 * Check if the company can add another automation rule for a specific module
 */
export async function canAddAutomationRule(
  companyId: number,
  currentCount: number,
  moduleKey:
    | "pipeline"
    | "communication"
    | "invoice"
    | "inventory"
    | "tag"
    | "service"
    | "marketing",
): Promise<boolean> {
  const ents = await getCompanyEntitlements(companyId);
  const { getAutomationLimitForModule } =
    await import("@/lib/platform-billing/automation-limits");
  const limit = getAutomationLimitForModule(ents, moduleKey);
  if (limit === -1) return true; // Unlimited
  return currentCount < limit;
}

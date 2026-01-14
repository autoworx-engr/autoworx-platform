import { db } from "@/lib/db";
import { PlatformSubscriptionStatus } from "@prisma/client";

export type Entitlements = {
  canUseVoice: boolean;
  canUseSms: boolean;
  callRecording: boolean;
  missedCallTextBack: boolean;
  maxAutomationRules: number;
  automationModules: string[];
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
  maxAutomationRules: 0,
  automationModules: [],
  websiteIncluded: false,
  carWrapVisualizer: false,
  aiSmartReplies: false,
  awxSalesAgent: false,
};

/**
 * Resolves the current entitlements for a company.
 * Caches results (TODO: Redis/Memory cache) to avoid DB hits on every request.
 */
export async function getCompanyEntitlements(companyId: number): Promise<Entitlements> {
  const subscription = await db.platformSubscription.findUnique({
    where: { companyId },
    include: {
      plan: {
        include: {
          features: true,
        },
      },
    },
  });

  if (!subscription || subscription.status === PlatformSubscriptionStatus.CANCELED || subscription.status === PlatformSubscriptionStatus.UNPAID) {
    return DEFAULT_ENTITLEMENTS;
  }

  const features = (subscription as any).plan.features;
  const entitlements: Entitlements = { ...DEFAULT_ENTITLEMENTS };

  features.forEach((f: any) => {
    const key = convertSnakeToCamel(f.featureKey);
    if (f.type === "BOOLEAN") {
      (entitlements as any)[key] = f.value === "true";
    } else if (f.type === "NUMERIC") {
      (entitlements as any)[key] = parseInt(f.value);
    } else if (f.type === "TEXT" && key === "automationModules") {
      entitlements.automationModules = f.value.split(",").map((s: string) => s.trim());
    }
  });

  return entitlements;
}

function convertSnakeToCamel(str: string) {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", "")
  );
}

/**
 * Fast check for a specific feature
 */
export async function hasFeature(companyId: number, feature: keyof Entitlements): Promise<boolean> {
  const ents = await getCompanyEntitlements(companyId);
  const val = ents[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  return false;
}

/**
 * Check if the company can add another automation rule
 */
export async function canAddAutomationRule(companyId: number, currentCount: number): Promise<boolean> {
  const ents = await getCompanyEntitlements(companyId);
  if (ents.maxAutomationRules === -1) return true; // Unlimited
  return currentCount < ents.maxAutomationRules;
}

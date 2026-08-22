import { db } from "@/lib/db";
import {
  PlatformFeatureType,
  PlatformSubscriptionStatus,
} from "@prisma/client";

export type PlatformEntitlements = Record<string, boolean | number | string>;

export function normalizeFeatureKey(featureKey: string): string {
  // Convert snake_case or kebab-case keys to camelCase for easier usage in TS.
  return featureKey
    .toLowerCase()
    .replace(/[-_]+([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

export function parseFeatureValue(
  type: PlatformFeatureType,
  raw: string,
): boolean | number | string {
  switch (type) {
    case PlatformFeatureType.BOOLEAN:
      return raw === "true" || raw === "1";
    case PlatformFeatureType.NUMERIC: {
      const num = Number(raw);
      return Number.isNaN(num) ? 0 : num;
    }
    case PlatformFeatureType.TEXT:
    default:
      return raw;
  }
}

/**
 * Build an entitlements map from a plan's features.
 * Keys are normalized to camelCase (e.g. "can_use_voice" -> "canUseVoice").
 */
export function buildEntitlementsFromFeatures(
  features: { featureKey: string; value: string; type: PlatformFeatureType }[],
): PlatformEntitlements {
  const entitlements: PlatformEntitlements = {};

  for (const feature of features) {
    const key = normalizeFeatureKey(feature.featureKey);
    entitlements[key] = parseFeatureValue(feature.type, feature.value);
  }

  return entitlements;
}

/**
 * Get entitlements for a specific platform plan (by plan ID).
 */
export async function getPlanEntitlements(
  planId: string,
): Promise<PlatformEntitlements | null> {
  const plan = await db.platformPlan.findUnique({
    where: { id: planId },
    include: { features: true },
  });

  if (!plan) return null;

  return buildEntitlementsFromFeatures(plan.features);
}

/**
 * Get entitlements for a company based on its current platform subscription.
 * Returns null if the company has no active subscription/plan.
 */
export async function getCompanyEntitlements(
  companyId: number,
): Promise<PlatformEntitlements | null> {
  const subscription = await db.platformSubscription.findUnique({
    where: { companyId },
    include: {
      plan: {
        include: { features: true },
      },
    },
  });

  if (
    !subscription ||
    !subscription.plan ||
    subscription.status === PlatformSubscriptionStatus.CANCELED ||
    subscription.status === PlatformSubscriptionStatus.UNPAID
  ) {
    return null;
  }

  return buildEntitlementsFromFeatures(subscription.plan.features);
}

"use server";

import { db } from "@/lib/db";
import { PlatformFeatureType, PlatformPlanInterval } from "@prisma/client";

export type CustomPlanFeatureInput = {
  key: string;
  type: PlatformFeatureType;
  value: boolean | number | string;
};

export type CreateCustomPlatformPlanInput = {
  label?: string;
  companyId?: number; // optional, for naming context only
  price: number;
  interval?: PlatformPlanInterval;
  description?: string | null;
  trialLengthDays?: number;
  basePlanId?: string; // optional: copy features from an existing plan when no features are provided
  features?: CustomPlanFeatureInput[];
};

function serializeFeatureValue(
  type: PlatformFeatureType,
  value: boolean | number | string,
): string {
  switch (type) {
    case PlatformFeatureType.BOOLEAN:
      return value === true || value === "true" || value === 1 || value === "1"
        ? "true"
        : "false";
    case PlatformFeatureType.NUMERIC:
      return typeof value === "number"
        ? value.toString()
        : String(Number(value) || 0);
    case PlatformFeatureType.TEXT:
    default:
      return String(value ?? "");
  }
}

/**
 * Create a custom PlatformPlan intended for a specific shop, with
 * an arbitrary set of features.
 *
 * This does **not** touch subscriptions or Authorize.Net directly;
 * it only defines a plan. Your existing `subscribeToPlatformPlan`
 * flow can then use the returned planId when onboarding that shop.
 */
export async function createCustomPlatformPlan(
  input: CreateCustomPlatformPlanInput,
) {
  const {
    label,
    companyId,
    price,
    interval = PlatformPlanInterval.MONTHLY,
    description,
    trialLengthDays = 0,
    basePlanId,
    features,
  } = input;

  if (!price || price <= 0) {
    throw new Error("Price must be greater than zero for a custom plan");
  }

  // Choose a human-friendly name. If label is provided, prefer it;
  // otherwise, fall back to a generic custom name with company context.
  const nameParts: string[] = [];
  nameParts.push(label || "Custom Plan");
  if (companyId) {
    nameParts.push(`(For You)`);
    // nameParts.push(`(Company ${companyId})`);
  }
  const planName = nameParts.join(" ");

  // Determine feature definitions: either explicit input or copied from base plan.
  let featureDefinitions: {
    key: string;
    type: PlatformFeatureType;
    value: string;
  }[] = [];

  if (features && features.length > 0) {
    featureDefinitions = features.map((f) => ({
      key: f.key,
      type: f.type,
      value: serializeFeatureValue(f.type, f.value),
    }));
  } else if (basePlanId) {
    const basePlan = await db.platformPlan.findUnique({
      where: { id: basePlanId },
      include: { features: true },
    });

    if (!basePlan) {
      throw new Error("Base plan not found");
    }

    featureDefinitions = basePlan.features.map((f) => ({
      key: f.featureKey,
      type: f.type,
      value: f.value,
    }));
  }

  // Basic ordering: put custom plans towards the end by default.
  // This is just a convention; AWX dashboard can ignore displayOrder if desired.
  const maxOrder = await db.platformPlan.aggregate({
    _max: { displayOrder: true },
  });

  const displayOrder = (maxOrder._max.displayOrder || 0) + 1;

  const plan = await db.platformPlan.create({
    data: {
      name: planName,
      description:
        description ||
        (companyId
          ? `Custom plan for company ${companyId}`
          : "Custom platform plan"),
      price,
      interval,
      trialLengthDays,
      displayOrder,
      isActive: true,
      companyId: companyId ?? null,
      features: {
        create: featureDefinitions.map((f) => ({
          featureKey: f.key,
          value: f.value,
          type: f.type,
        })),
      },
    },
    include: { features: true },
  });

  return {
    success: true,
    plan,
  };
}

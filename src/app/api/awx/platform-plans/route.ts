import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  assertSuperAdmin,
  requireBillingSession,
} from "@/lib/platform-billing/guards";
import { PlatformFeatureType, PlatformPlanInterval } from "@prisma/client";

const allowedIntervals = new Set(Object.values(PlatformPlanInterval));

const normalizeFeatures = (
  features: { key: string; type: PlatformFeatureType; value: string }[],
) => {
  const normalized = new Map<
    string,
    { key: string; type: PlatformFeatureType; value: string }
  >();

  for (const feature of features) {
    if (!feature?.key) continue;
    const key = feature.key.trim();
    if (!key) continue;
    if (!Object.values(PlatformFeatureType).includes(feature.type)) continue;

    normalized.set(key, {
      key,
      type: feature.type,
      value: String(feature.value ?? ""),
    });
  }

  return Array.from(normalized.values());
};

export async function POST(req: NextRequest) {
  try {
    const session = await requireBillingSession();
    assertSuperAdmin(session);

    const body = await req.json();
    const {
      name,
      description,
      price,
      interval,
      trialLengthDays,
      displayOrder,
      isActive,
      features = [],
    } = body as {
      name?: string;
      description?: string | null;
      price?: number;
      interval?: string;
      trialLengthDays?: number;
      displayOrder?: number;
      isActive?: boolean;
      features?: { key: string; type: PlatformFeatureType; value: string }[];
    };

    const priceValue = Number(price);
    if (!name || !Number.isFinite(priceValue) || priceValue <= 0) {
      return NextResponse.json(
        { success: false, message: "Name and price are required" },
        { status: 400 },
      );
    }

    const intervalValue = allowedIntervals.has(interval as PlatformPlanInterval)
      ? (interval as PlatformPlanInterval)
      : PlatformPlanInterval.MONTHLY;
    const trialValue = Number(trialLengthDays ?? 0);
    const displayValue = Number(displayOrder ?? 0);

    if (!Number.isFinite(trialValue) || trialValue < 0) {
      return NextResponse.json(
        { success: false, message: "Trial months must be 0 or more" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(displayValue) || displayValue < 0) {
      return NextResponse.json(
        { success: false, message: "Display order must be 0 or more" },
        { status: 400 },
      );
    }

    const normalizedFeatures = normalizeFeatures(features);

    const existing = await db.platformPlan.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A plan with this name already exists" },
        { status: 409 },
      );
    }

    const plan = await db.platformPlan.create({
      data: {
        name,
        description: description || null,
        price: priceValue,
        interval: intervalValue,
        trialLengthDays: trialValue,
        displayOrder: displayValue,
        isActive: isActive ?? true,
        features: {
          create: normalizedFeatures.map((feature) => ({
            featureKey: feature.key,
            value: feature.value,
            type: feature.type,
          })),
        },
      },
      include: { features: true, _count: { select: { subscriptions: true } } },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("❌ Plan create error", error);
    const message = error?.message || "Failed to create plan";
    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

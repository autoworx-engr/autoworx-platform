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

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, props: Params) {
  const params = await props.params;
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
      features,
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

    const planId = params.id;

    const updates: any = {};

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, message: "Name cannot be empty" },
          { status: 400 },
        );
      }
      const existing = await db.platformPlan.findFirst({
        where: { name: trimmed, NOT: { id: planId } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, message: "A plan with this name already exists" },
          { status: 409 },
        );
      }
      updates.name = trimmed;
    }

    if (description !== undefined) updates.description = description;

    if (price !== undefined) {
      const priceValue = Number(price);
      if (!Number.isFinite(priceValue) || priceValue <= 0) {
        return NextResponse.json(
          { success: false, message: "Price must be greater than zero" },
          { status: 400 },
        );
      }
      updates.price = priceValue;
    }

    if (interval !== undefined) {
      const intervalValue = allowedIntervals.has(
        interval as PlatformPlanInterval,
      )
        ? (interval as PlatformPlanInterval)
        : null;
      if (!intervalValue) {
        return NextResponse.json(
          { success: false, message: "Invalid interval" },
          { status: 400 },
        );
      }
      updates.interval = intervalValue;
    }

    if (trialLengthDays !== undefined) {
      const trialValue = Number(trialLengthDays);
      if (!Number.isFinite(trialValue) || trialValue < 0) {
        return NextResponse.json(
          { success: false, message: "Trial months must be 0 or more" },
          { status: 400 },
        );
      }
      updates.trialLengthDays = trialValue;
    }

    if (displayOrder !== undefined) {
      const displayValue = Number(displayOrder);
      if (!Number.isFinite(displayValue) || displayValue < 0) {
        return NextResponse.json(
          { success: false, message: "Display order must be 0 or more" },
          { status: 400 },
        );
      }
      updates.displayOrder = displayValue;
    }

    if (isActive !== undefined) updates.isActive = isActive;

    await db.$transaction(async (tx) => {
      if (Object.keys(updates).length > 0) {
        await tx.platformPlan.update({ where: { id: planId }, data: updates });
      }

      if (features) {
        const normalizedFeatures = normalizeFeatures(features);
        await tx.planFeature.deleteMany({ where: { planId } });
        if (normalizedFeatures.length > 0) {
          await tx.planFeature.createMany({
            data: normalizedFeatures.map((feature) => ({
              planId,
              featureKey: feature.key,
              value: feature.value,
              type: feature.type,
            })),
          });
        }
      }
    });

    const plan = await db.platformPlan.findUnique({
      where: { id: planId },
      include: { features: true, _count: { select: { subscriptions: true } } },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, message: "Plan not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("❌ Plan update error", error);
    const message = error?.message || "Failed to update plan";
    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const session = await requireBillingSession();
    assertSuperAdmin(session);

    const planId = params.id;

    const subscriptions = await db.platformSubscription.count({
      where: { planId },
    });

    if (subscriptions > 0) {
      return NextResponse.json(
        { success: false, message: "Plan has active subscriptions" },
        { status: 409 },
      );
    }

    await db.platformPlan.delete({ where: { id: planId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Plan delete error", error);
    const message = error?.message || "Failed to delete plan";
    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createCustomPlatformPlan } from "@/actions/platform-billing/custom-plan";
import { db } from "@/lib/db";
import { syncPlatformPlanToStripe } from "@/lib/platform-billing/stripe/catalog";
import { changePlatformStripeSubscriptionPrice } from "@/lib/platform-billing/stripe/subscription";
import {
  assertSuperAdmin,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

const LIVE_STATUSES = new Set(["ACTIVE", "PAST_DUE", "TRIALING"]);

export async function POST(req: NextRequest) {
  try {
    const session = await requireBillingSession();
    assertSuperAdmin(session);

    const body = await req.json();
    const { companyId, ...planInput } = body as {
      companyId?: number;
      [key: string]: any;
    };

    const result = await createCustomPlatformPlan({
      ...(planInput as any),
      companyId,
    });

    if (!result?.plan) {
      throw new Error("Failed to create custom plan");
    }

    // Best-effort: mirror the new plan into Stripe's catalog so it's ready to
    // use for checkout / a price swap. Not fatal if Stripe isn't configured
    // yet — the plan row itself is still created.
    let stripePriceId: string | null = null;
    try {
      const synced = await syncPlatformPlanToStripe(result.plan.id);
      stripePriceId = synced.priceId;
    } catch (err) {
      console.error("Failed to sync custom plan to Stripe:", err);
    }

    // If the company already has a platform subscription, re-point it to this
    // plan and push the new price to Stripe.
    if (companyId) {
      const existingSub = await db.platformSubscription.findUnique({
        where: { companyId },
      });

      if (existingSub) {
        await db.platformSubscription.update({
          where: { companyId },
          data: {
            planId: result.plan.id,
          },
        });

        if (
          existingSub.stripeSubscriptionId &&
          LIVE_STATUSES.has(existingSub.status) &&
          stripePriceId
        ) {
          try {
            await changePlatformStripeSubscriptionPrice({
              stripeSubscriptionId: existingSub.stripeSubscriptionId,
              newStripePriceId: stripePriceId,
              newPlanId: result.plan.id,
            });
          } catch (err) {
            console.error(
              "Failed to swap Stripe subscription price for custom plan:",
              err,
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, plan: result.plan });
  } catch (error: any) {
    console.error("❌ Custom plan API error", error);
    const message = error?.message || "Failed to create custom plan";
    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

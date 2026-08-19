import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelPlatformStripeSubscriptionImmediately } from "@/lib/platform-billing/stripe/subscription";
import { PlatformSubscriptionStatus } from "@prisma/client";
import {
  assertSuperAdmin,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

/**
 * Super-admin-only, immediate (non-reversible) cancel — for support
 * situations that can't wait for cancel-at-period-end. The owner-facing
 * cancel in src/actions/platform-billing/cancel.ts is always period-end for
 * Stripe subscriptions; this is the escape hatch that ends access right now.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireBillingSession();
    assertSuperAdmin(session);

    const { companyId } = (await req.json()) as { companyId?: number };
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }

    const subscription = await db.platformSubscription.findUnique({
      where: { companyId },
    });
    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        {
          success: false,
          message: "No Stripe subscription found for this company",
        },
        { status: 400 },
      );
    }

    await cancelPlatformStripeSubscriptionImmediately(
      subscription.stripeSubscriptionId,
    );

    await db.platformSubscription.update({
      where: { companyId },
      data: {
        status: PlatformSubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Force-cancel subscription error:", error);
    const message = error?.message || "Failed to cancel subscription";
    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createCustomPlatformPlan } from "@/actions/platform-billing/custom-plan";
import { db } from "@/lib/db";
import { updatePlatformARBSubscriptionAmount } from "@/lib/platform-billing/authorize-net";

export async function POST(req: NextRequest) {
  try {
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

    // If the company already has a platform subscription, re-point it to this plan
    // and update the ARB subscription amount so the new price is used from the
    // next billing cycle.
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

        if (existingSub.authNetSubscriptionId) {
          try {
            await updatePlatformARBSubscriptionAmount(
              existingSub.authNetSubscriptionId,
              Number(result.plan.price)
            );
          } catch (err) {
            console.error(
              "Failed to update ARB subscription amount for custom plan:",
              err
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, plan: result.plan });
  } catch (error: any) {
    console.error("❌ Custom plan API error", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create custom plan",
      },
      { status: 500 }
    );
  }
}

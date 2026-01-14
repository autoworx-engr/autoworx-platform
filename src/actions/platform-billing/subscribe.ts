"use server";

import { db } from "@/lib/db";
import { createPlatformARBSubscription, createPlatformCustomerProfile } from "@/lib/platform-billing/authorize-net";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function subscribeToPlatformPlan({
  companyId,
  planId,
  email,
  opaqueData,
}: {
  companyId: number;
  planId: string;
  email: string;
  opaqueData: { dataDescriptor: string; dataValue: string };
}) {
  try {
    const plan = await db.platformPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) throw new Error("Plan not found");

    // 1. Create or Get Billing Customer
    let billingCustomer = await db.platformBillingCustomer.findUnique({
      where: { companyId },
    });

    let customerProfileId = billingCustomer?.authNetProfileId;
    let customerPaymentProfileId: string | undefined;

    if (!customerProfileId) {
      // Create new CIM profile
      const cim = await createPlatformCustomerProfile(companyId, email, opaqueData);
      customerProfileId = cim.customerProfileId;
      customerPaymentProfileId = cim.customerPaymentProfileId;

      billingCustomer = await db.platformBillingCustomer.upsert({
        where: { companyId },
        update: { authNetProfileId: customerProfileId, email },
        create: { companyId, authNetProfileId: customerProfileId, email },
      });
    } else {
      // TODO: Handle existing profile (maybe update payment profile?)
      // For now assume they need a new profile or we just use the existing one if we had its payment profile
      throw new Error("Update payment method flow not yet implemented");
    }

    // 2. Create ARB Subscription
    const arb = await createPlatformARBSubscription({
      customerProfileId,
      customerPaymentProfileId,
      amount: Number(plan.price),
      intervalMonths: 1,
      startDate: new Date(),
      planName: plan.name,
    });

    // 3. Update DB
    const nextPeriodEnd = new Date();
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    await db.platformSubscription.upsert({
      where: { companyId },
      update: {
        planId: plan.id,
        authNetSubscriptionId: arb.subscriptionId,
        status: PlatformSubscriptionStatus.ACTIVE,
        currentPeriodEnd: nextPeriodEnd,
      },
      create: {
        companyId,
        billingCustomerId: billingCustomer.id,
        planId: plan.id,
        authNetSubscriptionId: arb.subscriptionId,
        status: PlatformSubscriptionStatus.ACTIVE,
        currentPeriodEnd: nextPeriodEnd,
      },
    });

    // 4. Create initial subscription item
    await db.platformSubscriptionItem.create({
      data: {
        subscriptionId: (await db.platformSubscription.findUnique({ where: { companyId } }))!.id,
        name: plan.name,
        price: plan.price,
        quantity: 1,
      },
    });

    revalidatePath("/dashboard/settings/billing");

    return { success: true };
  } catch (error: any) {
    console.error("❌ Subscription failed:", error);
    return { success: false, message: error.message || "Failed to subscribe" };
  }
}

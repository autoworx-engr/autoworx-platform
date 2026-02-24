"use server";

import { db } from "@/lib/db";
import {
  createPlatformARBSubscription,
  createPlatformCustomerProfile,
  createPlatformPaymentProfile,
  cancelPlatformARBSubscription,
  getCustomerProfile,
} from "@/lib/platform-billing/authorize-net";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

type SubscribeToPlatformPlanInput = {
  companyId: number;
  planId: string;
  email: string;
  firstName: string;
  lastName: string;
  opaqueData: { dataDescriptor: string; dataValue: string };
};

export async function subscribeToPlatformPlan({
  companyId,
  planId,
  email,
  firstName,
  lastName,
  opaqueData,
}: SubscribeToPlatformPlanInput) {
  try {
    const session = await requireBillingSession();
    assertCompanyAccess(session, companyId);

    const plan = await db.platformPlan.findFirst({
      where: {
        id: planId,
        isActive: true,
        OR: [{ companyId: null }, { companyId }],
      },
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
      const cim = await createPlatformCustomerProfile(
        companyId,
        email,
        firstName,
        lastName,
        opaqueData,
      );
      customerProfileId = cim.customerProfileId;
      customerPaymentProfileId = cim.customerPaymentProfileId;

      billingCustomer = await db.platformBillingCustomer.upsert({
        where: { companyId },
        update: { authNetProfileId: customerProfileId, email },
        create: { companyId, authNetProfileId: customerProfileId, email },
      });
    } else {
      // Add new payment profile to existing customer
      const pp = await createPlatformPaymentProfile(
        customerProfileId,
        firstName,
        lastName,
        opaqueData,
      );
      customerPaymentProfileId = pp.customerPaymentProfileId;
    }

    // 1.5 Sync Payment Method details to DB (best-effort)
    if (!customerProfileId || !customerPaymentProfileId || !billingCustomer) {
      console.warn(
        "Skipping payment method sync; missing profile or billing customer",
      );
    } else {
      try {
        const profile = await getCustomerProfile(customerProfileId);
        const pps =
          typeof profile.getPaymentProfiles === "function"
            ? profile.getPaymentProfiles()
            : profile.paymentProfiles || [];
        const currentPP = pps.find((p: any) => {
          const id =
            typeof p.getCustomerPaymentProfileId === "function"
              ? p.getCustomerPaymentProfileId()
              : p.customerPaymentProfileId || p.paymentProfileId;
          return id === customerPaymentProfileId;
        });

        if (currentPP) {
          const card = currentPP.getPayment
            ? currentPP.getPayment().getCreditCard()
            : currentPP.payment?.creditCard;
          if (!card) return;

          // Ensure only the latest method is marked as default
          await db.platformPaymentMethod.updateMany({
            where: { billingCustomerId: billingCustomer.id },
            data: { isDefault: false },
          });
          await db.platformPaymentMethod.upsert({
            where: { authNetPaymentProfileId: customerPaymentProfileId },
            update: {
              cardType: card.getCardType ? card.getCardType() : card.cardType,
              last4: card.getCardNumber
                ? card.getCardNumber().slice(-4)
                : card.cardNumber?.slice(-4),
              expiry: card.getExpirationDate
                ? card.getExpirationDate()
                : card.expirationDate,
            },
            create: {
              billingCustomerId: billingCustomer.id,
              authNetPaymentProfileId: customerPaymentProfileId,
              cardType: card.getCardType ? card.getCardType() : card.cardType,
              last4: card.getCardNumber
                ? card.getCardNumber().slice(-4)
                : card.cardNumber?.slice(-4),
              expiry: card.getExpirationDate
                ? card.getExpirationDate()
                : card.expirationDate,
              isDefault: true,
            },
          });
        }
      } catch (err) {
        console.error("Failed to sync payment method details:", err);
        // Don't fail the whole subscription if just syncing details fails
      }
    }

    // 2. Handle Existing Subscription (if any)
    const existingSub = await db.platformSubscription.findUnique({
      where: { companyId },
    });

    if (existingSub?.authNetSubscriptionId) {
      // For now, cancel old and create new to avoid logic complexity of ARB Update
      try {
        await cancelPlatformARBSubscription(existingSub.authNetSubscriptionId);
      } catch (err) {
        console.error("Failed to cancel old subscription:", err);
      }
    }

    // 2. Create ARB Subscription (Starting after free trial)
    const baseTrialMonths =
      plan.trialLengthDays && plan.trialLengthDays > 0
        ? plan.trialLengthDays
        : 0;
    const trialMonths = billingCustomer?.trialConsumedAt ? 0 : baseTrialMonths;
    const trialStart = new Date();
    const arbStartDate = new Date(trialStart);
    if (trialMonths > 0) {
      arbStartDate.setMonth(arbStartDate.getMonth() + trialMonths);
    }

    const intervalMonths = plan.interval === "YEARLY" ? 12 : 1;

    const arb = await createPlatformARBSubscription({
      customerProfileId,
      customerPaymentProfileId,
      amount: Number(plan.price),
      intervalMonths,
      startDate: arbStartDate,
      planName: plan.name,
    });

    // 3. No immediate charge. Trial lasts until arbStartDate.

    // 3. Update DB
    if (!billingCustomer) throw new Error("Billing customer record not found");

    const nextPeriodEnd = new Date(trialStart);
    if (trialMonths === 0) {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + intervalMonths);
    }

    const subscription = await db.platformSubscription.upsert({
      where: { companyId },
      update: {
        planId: plan.id,
        authNetSubscriptionId: arb.subscriptionId,
        status:
          trialMonths > 0
            ? PlatformSubscriptionStatus.TRIALING
            : PlatformSubscriptionStatus.ACTIVE,
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialMonths > 0 ? arbStartDate : nextPeriodEnd,
        billingAnchor: arbStartDate,
      },
      create: {
        companyId,
        billingCustomerId: billingCustomer.id,
        planId: plan.id,
        authNetSubscriptionId: arb.subscriptionId,
        status:
          trialMonths > 0
            ? PlatformSubscriptionStatus.TRIALING
            : PlatformSubscriptionStatus.ACTIVE,
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialMonths > 0 ? arbStartDate : nextPeriodEnd,
        billingAnchor: arbStartDate,
      },
    });
    if (trialMonths > 0 && !billingCustomer.trialConsumedAt) {
      await db.platformBillingCustomer.update({
        where: { id: billingCustomer.id },
        data: { trialConsumedAt: trialStart },
      });
    }
    // 4. Create initial subscription item
    await db.platformSubscriptionItem.create({
      data: {
        subscriptionId: subscription.id,
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

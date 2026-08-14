"use server";

import { db } from "@/lib/db";
import {
  createPlatformARBSubscription,
  createPlatformCustomerProfile,
  createPlatformPaymentProfile,
  cancelPlatformARBSubscription,
  getCustomerProfile,
  chargePlatformCustomerProfile,
  validateCustomerPaymentProfile,
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
  address: string;
  city: string;
  state: string;
  zip: string;
  opaqueData: { dataDescriptor: string; dataValue: string };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAuthNetRecordNotFound(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /record cannot be found/i.test(message) || /E00040/i.test(message);
}

export async function subscribeToPlatformPlan({
  companyId,
  planId,
  email,
  firstName,
  lastName,
  address,
  city,
  state,
  zip,
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

    // Authorize.Net requires billing address/city/state/zip on a $0 auth —
    // which is exactly what payment profile validation runs in production
    // (LIVEMODE) but not in sandbox/testMode. Collected directly from the
    // payer at checkout rather than the company's on-file business address,
    // since that may be missing/stale and isn't necessarily the cardholder's
    // billing address anyway.
    const billingAddress = { address, city, state, zip };

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
        billingAddress,
      );
      customerProfileId = cim.customerProfileId;
      customerPaymentProfileId = cim.customerPaymentProfileId;

      billingCustomer = await db.platformBillingCustomer.upsert({
        where: { companyId },
        update: { authNetProfileId: customerProfileId, email },
        create: { companyId, authNetProfileId: customerProfileId, email },
      });
    } else {
      // Verify existing remote profile still exists before we attach payment
      // profile data to prevent stale local IDs from causing E00040 later.
      try {
        await getCustomerProfile(customerProfileId);
      } catch (profileErr: any) {
        if (!isAuthNetRecordNotFound(profileErr)) {
          throw profileErr;
        }

        console.warn(
          `Stored Authorize.Net customer profile ${customerProfileId} is stale. Recreating profile for company ${companyId}.`,
        );

        const recreated = await createPlatformCustomerProfile(
          companyId,
          email,
          firstName,
          lastName,
          opaqueData,
          billingAddress,
        );
        customerProfileId = recreated.customerProfileId;
        customerPaymentProfileId = recreated.customerPaymentProfileId;

        billingCustomer = await db.platformBillingCustomer.upsert({
          where: { companyId },
          update: { authNetProfileId: customerProfileId, email },
          create: { companyId, authNetProfileId: customerProfileId, email },
        });
      }

      if (!customerPaymentProfileId) {
        // Add new payment profile to existing customer. If profile becomes
        // stale between existence-check and create call, recreate customer.
        try {
          const pp = await createPlatformPaymentProfile(
            customerProfileId,
            firstName,
            lastName,
            opaqueData,
            false,
            billingAddress,
          );
          customerPaymentProfileId = pp.customerPaymentProfileId;
        } catch (paymentProfileErr: any) {
          if (!isAuthNetRecordNotFound(paymentProfileErr)) {
            throw paymentProfileErr;
          }

          console.warn(
            `Customer profile ${customerProfileId} became stale during payment profile creation. Recreating and retrying for company ${companyId}.`,
          );

          const recreated = await createPlatformCustomerProfile(
            companyId,
            email,
            firstName,
            lastName,
            opaqueData,
            billingAddress,
          );

          customerProfileId = recreated.customerProfileId;
          customerPaymentProfileId = recreated.customerPaymentProfileId;

          billingCustomer = await db.platformBillingCustomer.upsert({
            where: { companyId },
            update: { authNetProfileId: customerProfileId, email },
            create: { companyId, authNetProfileId: customerProfileId, email },
          });
        }
      }
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

          if (card) {
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
          } // end if (card)
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

    // 2. Create ARB Subscription
    // If no trial: charge immediately now via one-time CIM transaction, then
    // start ARB from next interval so there is no double-charge.
    // If trial: ARB starts at trial end date; no immediate charge.
    const baseTrialMonths =
      plan.trialLengthDays && plan.trialLengthDays > 0
        ? plan.trialLengthDays
        : 0;
    const trialMonths = billingCustomer?.trialConsumedAt ? 0 : baseTrialMonths;
    const trialStart = new Date();
    const intervalMonths = plan.interval === "YEARLY" ? 12 : 1;

    // arbStartDate = when ARB fires its FIRST recurring charge
    const arbStartDate = new Date(trialStart);
    if (trialMonths > 0) {
      // Trial: ARB starts after trial ends
      arbStartDate.setMonth(arbStartDate.getMonth() + trialMonths);
    } else {
      // No trial: charge immediately below, ARB starts at next period
      arbStartDate.setMonth(arbStartDate.getMonth() + intervalMonths);
    }

    // Validate profile + create ARB with bounded retries for transient
    // propagation windows (fresh payment profile may return E00040 briefly).
    const retryDelaysMs = [0, 400, 1200, 2500];
    let arb: { subscriptionId: string } | null = null;
    let lastRetryableError: any = null;

    for (let i = 0; i < retryDelaysMs.length; i++) {
      if (retryDelaysMs[i] > 0) {
        await sleep(retryDelaysMs[i]);
      }

      try {
        await validateCustomerPaymentProfile(
          customerProfileId,
          customerPaymentProfileId!,
        );

        arb = await createPlatformARBSubscription({
          customerProfileId,
          customerPaymentProfileId: customerPaymentProfileId!,
          amount: Number(plan.price),
          intervalMonths,
          startDate: arbStartDate,
          planName: plan.name,
        });
        break;
      } catch (err: any) {
        if (!isAuthNetRecordNotFound(err)) {
          throw err;
        }

        lastRetryableError = err;
        const isLastAttempt = i === retryDelaysMs.length - 1;
        console.warn(
          `Transient Authorize.Net profile propagation issue (attempt ${i + 1}/${retryDelaysMs.length}): ${err?.message || err}`,
        );
        if (isLastAttempt) {
          break;
        }
      }
    }

    if (!arb) {
      console.error(
        "Failed to create ARB subscription after retries:",
        lastRetryableError?.message || lastRetryableError,
      );
      throw new Error(
        "Your card details were received, but the payment gateway is still syncing them. Please retry in a few seconds.",
      );
    }

    // 2.5 Immediate first charge (no-trial flow only)
    // This gives instant confirmation, and the webhook for this transaction
    // is a plain authcapture (not tied to an ARB subscription ID), so we
    // record the invoice/payment here directly instead of relying on webhook.
    let firstChargeTransId: string | null = null;
    if (trialMonths === 0) {
      try {
        const charge = await chargePlatformCustomerProfile({
          customerProfileId,
          customerPaymentProfileId,
          amount: Number(plan.price),
          description: `${plan.name} — first billing period`,
        });
        firstChargeTransId = charge.transactionId;
      } catch (chargeErr: any) {
        // First charge failed — cancel the ARB we just created so the customer
        // is not charged in the next billing cycle with no subscription record.
        try {
          await cancelPlatformARBSubscription(arb.subscriptionId);
        } catch {
          // best-effort: log but don't mask the original charge error
          console.error(
            "Failed to cancel orphaned ARB after charge failure:",
            arb.subscriptionId,
          );
        }
        throw new Error(
          chargeErr.message || "Payment failed. Your card was not charged.",
        );
      }
    }

    // 3. Update DB
    if (!billingCustomer) throw new Error("Billing customer record not found");

    const nextPeriodEnd = new Date(trialStart);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + intervalMonths);

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

    // 3.5 Record first charge invoice/payment in DB immediately
    // (not via webhook — the immediate CIM charge has no ARB subscription
    // reference so the webhook would skip it)
    if (firstChargeTransId) {
      await db.$transaction(async (tx) => {
        const invoice = await tx.platformInvoice.create({
          data: {
            billingCustomerId: billingCustomer!.id,
            subscriptionId: subscription.id,
            amount: plan.price,
            status: "PAID",
            authNetTransId: firstChargeTransId!,
          },
        });
        await tx.platformPayment.create({
          data: {
            platformInvoiceId: invoice.id,
            amount: plan.price,
            status: "SUCCESS",
            authNetTransId: firstChargeTransId!,
          },
        });
      });
    }
    // 4. Upsert subscription item (replace old items to avoid duplicates on re-subscribe)
    await db.platformSubscriptionItem.deleteMany({
      where: { subscriptionId: subscription.id },
    });
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

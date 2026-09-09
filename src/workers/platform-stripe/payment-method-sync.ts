import { db } from "@/lib/db";
import { getPlatformStripeClient } from "@/lib/platform-billing/stripe/client";
import type Stripe from "stripe";

/** Keeps PlatformPaymentMethod in sync so the billing UI can show the card on file. */
export async function handlePaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod,
) {
  const stripeCustomerId =
    typeof paymentMethod.customer === "string"
      ? paymentMethod.customer
      : paymentMethod.customer?.id;
  if (!stripeCustomerId) return;

  const billingCustomer = await db.platformBillingCustomer.findUnique({
    where: { stripeCustomerId },
  });
  if (!billingCustomer) return;

  const card = paymentMethod.card;
  const expiry = card
    ? `${String(card.exp_month).padStart(2, "0")}/${card.exp_year}`
    : null;

  // Prefer Stripe's own default rather than assuming the newest card wins —
  // a second card added through the Portal is attached without becoming the
  // one we bill. During Checkout the default isn't set yet, so treat an
  // unknown default as "this is the card" to avoid showing none at all.
  let isDefault = true;
  try {
    const customer =
      await getPlatformStripeClient().customers.retrieve(stripeCustomerId);
    if (!customer.deleted) {
      const defaultPm = customer.invoice_settings?.default_payment_method;
      const defaultPmId =
        typeof defaultPm === "string" ? defaultPm : defaultPm?.id;
      if (defaultPmId) isDefault = defaultPmId === paymentMethod.id;
    }
  } catch (err) {
    console.error(
      "[platform-stripe] could not read customer default payment method:",
      err,
    );
  }

  const cardFields = {
    cardType: card?.brand ?? null,
    last4: card?.last4 ?? null,
    expiry,
    isDefault,
  };

  await db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.platformPaymentMethod.updateMany({
        where: { billingCustomerId: billingCustomer.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    await tx.platformPaymentMethod.upsert({
      where: { stripePaymentMethodId: paymentMethod.id },
      update: cardFields,
      create: {
        billingCustomerId: billingCustomer.id,
        stripePaymentMethodId: paymentMethod.id,
        ...cardFields,
      },
    });
  });
}

/**
 * payment_method.attached only fires when a card is added, so switching the
 * default between cards already on file in the Portal would otherwise leave
 * the billing UI pointing at the wrong card indefinitely.
 */
export async function handleCustomerDefaultPaymentMethodChanged(
  customer: Stripe.Customer,
) {
  const billingCustomer = await db.platformBillingCustomer.findUnique({
    where: { stripeCustomerId: customer.id },
  });
  if (!billingCustomer) return;

  const defaultPm = customer.invoice_settings?.default_payment_method;
  const defaultPmId = typeof defaultPm === "string" ? defaultPm : defaultPm?.id;
  if (!defaultPmId) return;

  // Bail if we don't track the new default yet — clearing the old one without
  // a replacement would leave the UI showing no card at all.
  const target = await db.platformPaymentMethod.findUnique({
    where: { stripePaymentMethodId: defaultPmId },
  });
  if (!target || target.billingCustomerId !== billingCustomer.id) return;
  if (target.isDefault) return;

  await db.$transaction([
    db.platformPaymentMethod.updateMany({
      where: { billingCustomerId: billingCustomer.id, isDefault: true },
      data: { isDefault: false },
    }),
    db.platformPaymentMethod.update({
      where: { id: target.id },
      data: { isDefault: true },
    }),
  ]);
}

export async function handlePaymentMethodDetached(
  paymentMethod: Stripe.PaymentMethod,
) {
  // The detached event's `customer` is already null, so match on the id.
  await db.platformPaymentMethod.deleteMany({
    where: { stripePaymentMethodId: paymentMethod.id },
  });
}

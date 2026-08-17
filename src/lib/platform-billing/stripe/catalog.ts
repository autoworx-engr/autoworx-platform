import "server-only";
import { db } from "@/lib/db";
import { getPlatformStripeClient } from "./client";

function priceIntervalFor(interval: "MONTHLY" | "YEARLY"): "month" | "year" {
  return interval === "YEARLY" ? "year" : "month";
}

function unitAmountFor(price: unknown): number {
  return Math.round(Number(price) * 100);
}

/**
 * Idempotent Product + Price upsert for a single PlatformPlan.
 * Prices are immutable in Stripe — if the amount or interval changed since
 * the last sync, a new Price is created (with the same lookup_key, moved via
 * transfer_lookup_key) and the plan record is repointed to it. The old Price
 * is archived, not deleted, so past invoices keep referencing a valid object.
 *
 * Safe to call repeatedly (e.g. after every plan create/update, or from the
 * standalone bulk-sync script) — a no-op when Stripe already matches the plan.
 */
export async function syncPlatformPlanToStripe(planId: string) {
  const stripe = getPlatformStripeClient();
  const plan = await db.platformPlan.findUniqueOrThrow({
    where: { id: planId },
  });

  const lookupKey = `platform-plan-${plan.id}`;
  const desiredAmount = unitAmountFor(plan.price);
  const desiredInterval = priceIntervalFor(plan.interval);

  // 1. Product — mutable, just keep name/description current in place.
  let productId = plan.stripeProductId;
  if (productId) {
    try {
      await stripe.products.update(productId, {
        name: plan.name,
        description: plan.description || undefined,
        active: plan.isActive,
      });
    } catch (err: any) {
      if (err?.code !== "resource_missing") throw err;
      productId = null; // fall through to recreate below
    }
  }
  if (!productId) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description || undefined,
      metadata: { platformPlanId: plan.id },
    });
    productId = product.id;
  }

  // 2. Price — immutable; only replace when the amount/interval drifted.
  let priceId = plan.stripePriceId;
  let needsNewPrice = !priceId;

  if (priceId) {
    try {
      const existing = await stripe.prices.retrieve(priceId);
      needsNewPrice =
        !existing.active ||
        existing.unit_amount !== desiredAmount ||
        existing.recurring?.interval !== desiredInterval;
    } catch (err: any) {
      if (err?.code !== "resource_missing") throw err;
      needsNewPrice = true;
    }
  }

  if (needsNewPrice) {
    const newPrice = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: desiredAmount,
      recurring: { interval: desiredInterval },
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      metadata: { platformPlanId: plan.id },
    });

    if (priceId) {
      await stripe.prices.update(priceId, { active: false });
    }
    priceId = newPrice.id;
  }

  await db.platformPlan.update({
    where: { id: plan.id },
    data: { stripeProductId: productId, stripePriceId: priceId },
  });

  return { productId, priceId };
}

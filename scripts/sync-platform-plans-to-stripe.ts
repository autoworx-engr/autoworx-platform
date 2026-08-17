/**
 * Bulk Product+Price sync for every active PlatformPlan.
 *
 * Mirrors `syncPlatformPlanToStripe` in
 * src/lib/platform-billing/stripe/catalog.ts, but that module imports
 * "server-only" (transitively via @/lib/db), which unconditionally throws
 * outside a Next.js Server Component — so a plain `tsx` script can't import
 * it and instead builds its own Stripe/Prisma clients directly, same as
 * scripts/normalize-client-phones.ts does for the same reason.
 *
 * Usage:
 *   npx tsx scripts/sync-platform-plans-to-stripe.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString: databaseUrl });
const db = new PrismaClient({ adapter });

const secretKey = process.env.PLATFORM_STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("PLATFORM_STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}
const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });

function priceIntervalFor(interval: string): "month" | "year" {
  return interval === "YEARLY" ? "year" : "month";
}

async function syncPlan(plan: {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  interval: string;
  isActive: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
}) {
  const lookupKey = `platform-plan-${plan.id}`;
  const desiredAmount = Math.round(Number(plan.price) * 100);
  const desiredInterval = priceIntervalFor(plan.interval);

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
      productId = null;
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

  return {
    planId: plan.id,
    name: plan.name,
    productId,
    priceId,
    created: needsNewPrice,
  };
}

async function main() {
  const plans = await db.platformPlan.findMany({ where: { isActive: true } });
  console.log(`Syncing ${plans.length} active plan(s) to Stripe...`);

  for (const plan of plans) {
    try {
      const result = await syncPlan(plan);
      console.log(
        `  ✓ ${result.name} — product ${result.productId}, price ${result.priceId}${result.created ? " (new price)" : ""}`,
      );
    } catch (err) {
      console.error(`  ✗ Failed to sync plan ${plan.id} (${plan.name}):`, err);
    }
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});

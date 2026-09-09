/**
 * Test-clock driver for platform billing. A renewal is a month away and a
 * dunning cycle is a week long, so the only way to exercise either is to put a
 * subscription on a Stripe test clock and fast-forward it.
 *
 * Test-clock customers must be created *on* the clock, so this bypasses our
 * Checkout flow and creates the subscription through the API with the same
 * metadata Checkout sets. Everything downstream — the webhooks, the workers,
 * PlatformInvoice/PlatformPayment, entitlement revocation — is the real code
 * path. Run `stripe listen` first or nothing will be recorded.
 *
 * Usage (test mode only):
 *   npx tsx scripts/platform-billing-testclock.ts create <companyId> <planName> [--fail-now]
 *   npx tsx scripts/platform-billing-testclock.ts break                # swap in a card that declines
 *   npx tsx scripts/platform-billing-testclock.ts advance <days>
 *   npx tsx scripts/platform-billing-testclock.ts status
 *   npx tsx scripts/platform-billing-testclock.ts cleanup
 *
 * State lives in .platform-billing-testclock.json (gitignored, delete freely).
 */
import "dotenv/config";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";

const STATE_FILE = ".platform-billing-testclock.json";
const GOOD_CARD = "pm_card_visa";
const DECLINING_CARD = "pm_card_chargeCustomerFail";

const secretKey = process.env.PLATFORM_STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("PLATFORM_STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}
if (!secretKey.startsWith("sk_test_")) {
  console.error(
    "Refusing to run: this script creates and cancels subscriptions and must never touch a live key.",
  );
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  }),
});

type State = {
  clockId: string;
  customerId: string;
  subscriptionId: string;
  companyId: number;
  planName: string;
};

function readState(): State {
  if (!existsSync(STATE_FILE)) {
    console.error(`No ${STATE_FILE} — run "create" first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
}

async function attachAndDefault(customerId: string, paymentMethod: string) {
  const attached = await stripe.paymentMethods.attach(paymentMethod, {
    customer: customerId,
  });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: attached.id },
  });
  return attached.id;
}

async function create(companyId: number, planName: string, failNow: boolean) {
  const plan = await db.platformPlan.findFirst({
    where: { name: planName },
    select: {
      id: true,
      name: true,
      stripePriceId: true,
      trialLengthDays: true,
    },
  });
  if (!plan) throw new Error(`No plan named "${planName}"`);
  if (!plan.stripePriceId) {
    throw new Error(
      `Plan "${plan.name}" is not synced — run scripts/sync-platform-plans-to-stripe.ts`,
    );
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, enforcePlatformPlan: true },
  });
  if (!company) throw new Error(`No company ${companyId}`);
  if (!company.enforcePlatformPlan) {
    console.warn(
      `WARNING: company ${companyId} is in legacy plan mode — the billing page is hidden and entitlements ignore the subscription.`,
    );
  }

  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: `platform-billing co${companyId}`,
  });

  const customer = await stripe.customers.create({
    email: `billing-test-co${companyId}@example.com`,
    test_clock: clock.id,
    metadata: { companyId: String(companyId) },
  });

  // Production records the customer id before Checkout attaches a card (see
  // ensurePlatformStripeCustomer), and handlePaymentMethodAttached resolves the
  // company through it — so seed it first or the card mirror silently no-ops.
  const priorBillingCustomer = await db.platformBillingCustomer.findUnique({
    where: { companyId },
    select: { id: true, stripeCustomerId: true },
  });
  const billingCustomer = await db.platformBillingCustomer.upsert({
    where: { companyId },
    update: { stripeCustomerId: customer.id },
    create: { companyId, stripeCustomerId: customer.id },
  });
  if (
    priorBillingCustomer?.stripeCustomerId &&
    priorBillingCustomer.stripeCustomerId !== customer.id
  ) {
    await db.platformPaymentMethod.deleteMany({
      where: { billingCustomerId: billingCustomer.id },
    });
  }

  await attachAndDefault(customer.id, failNow ? DECLINING_CARD : GOOD_CARD);

  // Mirror what createPlatformCheckoutSession sets, trial included, so the
  // webhook handlers see the same shape they see in production.
  const trialEligible = plan.trialLengthDays > 0;
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: plan.stripePriceId }],
    metadata: { companyId: String(companyId), planId: plan.id },
    ...(trialEligible
      ? {
          trial_period_days: plan.trialLengthDays,
          trial_settings: {
            end_behavior: { missing_payment_method: "cancel" as const },
          },
        }
      : {}),
  });

  const state: State = {
    clockId: clock.id,
    customerId: customer.id,
    subscriptionId: subscription.id,
    companyId,
    planName: plan.name,
  };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log(`clock         ${clock.id}`);
  console.log(`customer      ${customer.id}`);
  console.log(`subscription  ${subscription.id}  (${subscription.status})`);
  console.log(`card          ${failNow ? "DECLINING" : "good"}`);
  console.log(
    `trial         ${trialEligible ? `${plan.trialLengthDays}d` : "none"}`,
  );
  console.log(`\nstate written to ${STATE_FILE}`);
  console.log(`\nNext: npx tsx scripts/platform-billing-state.ts ${companyId}`);
}

async function breakCard() {
  const state = readState();
  const id = await attachAndDefault(state.customerId, DECLINING_CARD);
  console.log(`default payment method is now ${id} (declines on charge)`);
  console.log(
    "Advance past the period end to drive invoice.payment_failed -> past_due.",
  );
}

async function fixCard() {
  const state = readState();
  const id = await attachAndDefault(state.customerId, GOOD_CARD);
  console.log(`default payment method is now ${id} (succeeds)`);
  console.log('Then: "retry" to collect the open invoice immediately.');
}

/** Collect the open invoice now instead of waiting for Stripe's retry schedule. */
async function retryOpenInvoice() {
  const state = readState();
  const invoices = await stripe.invoices.list({
    subscription: state.subscriptionId,
    status: "open",
    limit: 1,
  });
  const invoice = invoices.data[0];
  if (!invoice?.id) {
    console.log("no open invoice to collect");
    return;
  }
  const paid = await stripe.invoices.pay(invoice.id);
  console.log(`invoice ${invoice.id} -> ${paid.status}`);
  await new Promise((r) => setTimeout(r, 6000));
  return status();
}

/** Immediate cancel — fires customer.subscription.deleted. */
async function cancelNow() {
  const state = readState();
  const cancelled = await stripe.subscriptions.cancel(state.subscriptionId);
  console.log(`subscription ${cancelled.id} -> ${cancelled.status}`);
  await new Promise((r) => setTimeout(r, 6000));
  return status();
}

async function advance(days: number) {
  const state = readState();
  const clock = await stripe.testHelpers.testClocks.retrieve(state.clockId);
  const target = clock.frozen_time + days * 24 * 60 * 60;

  console.log(
    `advancing ${new Date(clock.frozen_time * 1000).toISOString()} -> ${new Date(target * 1000).toISOString()}`,
  );
  await stripe.testHelpers.testClocks.advance(state.clockId, {
    frozen_time: target,
  });

  // Stripe generates invoices and fires webhooks asynchronously while the clock
  // settles; reporting status before then would just show the old state.
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const current = await stripe.testHelpers.testClocks.retrieve(state.clockId);
    if (current.status === "ready") {
      console.log("clock ready");
      return status();
    }
    if (current.status === "internal_failure") {
      throw new Error("test clock hit an internal failure");
    }
  }
  console.warn("clock still advancing after 2 minutes — check the dashboard");
}

async function status() {
  const state = readState();
  const [clock, subscription] = await Promise.all([
    stripe.testHelpers.testClocks.retrieve(state.clockId),
    stripe.subscriptions.retrieve(state.subscriptionId),
  ]);
  const item = subscription.items.data[0];

  console.log(`\nSTRIPE`);
  console.log(
    `  clock         ${clock.status}  @ ${new Date(clock.frozen_time * 1000).toISOString()}`,
  );
  console.log(
    `  subscription  ${subscription.status}${subscription.cancel_at_period_end ? " (cancel at period end)" : ""}`,
  );
  console.log(
    `  period        ${item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString().slice(0, 16) : "?"} -> ${item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString().slice(0, 16) : "?"}`,
  );

  const invoices = await stripe.invoices.list({
    subscription: state.subscriptionId,
    limit: 10,
  });
  console.log(`  invoices      ${invoices.data.length}`);
  for (const invoice of invoices.data) {
    console.log(
      `    ${invoice.status?.padEnd(13)} $${((invoice.amount_due ?? 0) / 100).toFixed(2)}  attempts:${invoice.attempt_count}  next retry:${invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString().slice(0, 16) : "-"}  ${invoice.id}`,
    );
  }

  const local = await db.platformSubscription.findUnique({
    where: { companyId: state.companyId },
    include: {
      plan: { select: { name: true } },
      billingCustomer: {
        include: { invoices: { orderBy: { createdAt: "desc" }, take: 10 } },
      },
    },
  });

  console.log(`\nOUR DATABASE (company ${state.companyId})`);
  if (!local) {
    console.log("  no PlatformSubscription row — webhooks have not landed yet");
  } else {
    console.log(
      `  status        ${local.status}${local.cancelAtPeriodEnd ? " (cancel at period end)" : ""}   plan ${local.plan?.name}`,
    );
    console.log(
      `  period        ${local.currentPeriodStart?.toISOString().slice(0, 16)} -> ${local.currentPeriodEnd?.toISOString().slice(0, 16)}`,
    );
    console.log(`  invoices      ${local.billingCustomer.invoices.length}`);
    for (const invoice of local.billingCustomer.invoices) {
      console.log(
        `    ${invoice.status.padEnd(6)} $${Number(invoice.amount).toFixed(2)}  ${invoice.stripeInvoiceId ?? "(pre-migration)"}`,
      );
    }
  }

  const pending = await db.webhookEvent.findMany({
    where: {
      gateway: "PLATFORM_STRIPE",
      status: { in: ["PENDING", "FAILED"] },
    },
    select: { eventId: true, status: true, lastError: true },
  });
  if (pending.length > 0) {
    console.log(`\nUNPROCESSED EVENTS (${pending.length})`);
    for (const event of pending) {
      console.log(
        `  ${event.status} ${event.eventId} — ${event.lastError ?? ""}`,
      );
    }
  }
  console.log("");
}

async function cleanup() {
  const state = readState();
  // Deleting the clock removes every object created on it, subscription
  // included — no need to cancel first.
  await stripe.testHelpers.testClocks.del(state.clockId);
  unlinkSync(STATE_FILE);
  console.log(`deleted clock ${state.clockId} and everything on it`);
  console.log(
    `NOTE: the PlatformSubscription row for company ${state.companyId} is still in our DB — clear it by hand if you want a clean re-run.`,
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "create":
      if (!args[0] || !args[1]) {
        throw new Error('usage: create <companyId> "<planName>" [--fail-now]');
      }
      return create(Number(args[0]), args[1], args.includes("--fail-now"));
    case "break":
      return breakCard();
    case "fix":
      return fixCard();
    case "retry":
      return retryOpenInvoice();
    case "cancel":
      return cancelNow();
    case "advance":
      if (!args[0]) throw new Error("usage: advance <days>");
      return advance(Number(args[0]));
    case "status":
      return status();
    case "cleanup":
      return cleanup();
    default:
      console.log(
        "commands: create <companyId> <planName> [--fail-now] | break | fix | retry | cancel | advance <days> | status | cleanup",
      );
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

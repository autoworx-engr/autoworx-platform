/**
 * Read-only snapshot of platform billing (AutoWorx billing its tenant
 * companies). Run it before and after each manual test step to see what the
 * webhooks actually wrote, instead of guessing from the UI.
 *
 * Usage:
 *   npx tsx scripts/platform-billing-state.ts            # everything
 *   npx tsx scripts/platform-billing-state.ts 21         # one company
 *   npx tsx scripts/platform-billing-state.ts --candidates   # pick a test company
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
});
const db = new PrismaClient({ adapter });

const arg = process.argv[2];
const onlyCompanyId = arg && !arg.startsWith("--") ? Number(arg) : null;

function money(value: unknown) {
  return `$${Number(value).toFixed(2)}`;
}

/** Companies that can actually reach the billing page and have no live subscription. */
async function listCandidates() {
  const companies = await db.company.findMany({
    where: {
      enforcePlatformPlan: true,
      platformSubscription: { is: null },
      users: { some: { employeeType: { in: ["Admin", "Manager"] } } },
    },
    select: {
      id: true,
      name: true,
      users: {
        where: { employeeType: { in: ["Admin", "Manager"] } },
        select: { email: true, employeeType: true },
        take: 2,
      },
    },
    take: 15,
  });

  console.log(`\nCLEAN TEST CANDIDATES (${companies.length})`);
  console.log(
    "  platform-plan mode, no subscription row, has an Admin/Manager login",
  );
  for (const company of companies) {
    const logins = company.users
      .map((u) => `${u.email} (${u.employeeType})`)
      .join(", ");
    console.log(`  company ${company.id} — ${company.name} — ${logins}`);
  }

  const freeloaders = await db.platformSubscription.findMany({
    where: {
      stripeSubscriptionId: null,
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
    },
    select: {
      companyId: true,
      status: true,
      company: { select: { name: true, enforcePlatformPlan: true } },
    },
  });

  console.log(
    `\nLIVE STATUS WITH NO STRIPE SUBSCRIPTION (${freeloaders.length})`,
  );
  console.log(
    "  pre-migration rows: entitlements are granted but nothing is billing them",
  );
  for (const row of freeloaders) {
    console.log(
      `  company ${row.companyId} — ${row.company.name} — ${row.status}${row.company.enforcePlatformPlan ? "" : " (legacy mode)"}`,
    );
  }
  console.log("");
}

async function main() {
  if (arg === "--candidates") {
    await listCandidates();
    return;
  }

  const plans = await db.platformPlan.findMany({
    orderBy: { displayOrder: "asc" },
    select: {
      name: true,
      price: true,
      interval: true,
      trialLengthDays: true,
      isActive: true,
      companyId: true,
      stripePriceId: true,
    },
  });

  console.log(`\nPLANS (${plans.length})`);
  for (const plan of plans) {
    const scope = plan.companyId ? `custom:${plan.companyId}` : "public";
    console.log(
      `  ${plan.isActive ? "active  " : "inactive"} ${plan.name} — ${money(plan.price)}/${plan.interval} — trial ${plan.trialLengthDays}d — ${scope} — ${plan.stripePriceId ? "synced" : "NOT SYNCED TO STRIPE"}`,
    );
  }

  const subscriptions = await db.platformSubscription.findMany({
    where: onlyCompanyId ? { companyId: onlyCompanyId } : undefined,
    include: {
      plan: { select: { name: true } },
      company: { select: { name: true, enforcePlatformPlan: true } },
      billingCustomer: {
        include: {
          paymentMethods: { where: { isDefault: true } },
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 6,
            include: { payments: true },
          },
        },
      },
    },
  });

  console.log(`\nSUBSCRIPTIONS (${subscriptions.length})`);
  for (const sub of subscriptions) {
    console.log(
      `\n  company ${sub.companyId} (${sub.company.name})${sub.company.enforcePlatformPlan ? "" : "  [LEGACY MODE — billing page hidden]"}`,
    );
    console.log(
      `    plan          ${sub.plan?.name ?? "none"} — status ${sub.status}${sub.cancelAtPeriodEnd ? " — CANCEL AT PERIOD END" : ""}`,
    );
    console.log(`    stripe sub    ${sub.stripeSubscriptionId ?? "none"}`);
    console.log(
      `    period        ${sub.currentPeriodStart?.toISOString().slice(0, 16) ?? "?"} -> ${sub.currentPeriodEnd?.toISOString().slice(0, 16) ?? "?"}`,
    );
    console.log(
      `    trial used    ${sub.billingCustomer.trialConsumedAt?.toISOString().slice(0, 10) ?? "no"}`,
    );

    const [card] = sub.billingCustomer.paymentMethods;
    console.log(
      `    default card  ${card ? `${card.cardType ?? "?"} ****${card.last4 ?? "????"} exp ${card.expiry ?? "?"}` : "none"}`,
    );

    const invoices = sub.billingCustomer.invoices;
    console.log(
      `    invoices      ${invoices.length || "none"} (latest first)`,
    );
    for (const invoice of invoices) {
      const paid = invoice.payments.filter((p) => p.status === "SUCCESS");
      console.log(
        `      ${invoice.createdAt.toISOString().slice(0, 16)}  ${invoice.status.padEnd(6)} ${money(invoice.amount)}  payments:${paid.length}  ${invoice.stripeInvoiceId ?? "(pre-migration)"}`,
      );
    }
  }

  const events = await db.webhookEvent.findMany({
    where: { gateway: "PLATFORM_STRIPE" },
    orderBy: { receivedAt: "desc" },
    take: 15,
    select: {
      eventId: true,
      status: true,
      attempts: true,
      companyId: true,
      receivedAt: true,
      lastError: true,
      payload: true,
    },
  });

  console.log(`\nRECENT PLATFORM_STRIPE EVENTS (${events.length})`);
  for (const event of events) {
    const type = (event.payload as { type?: string })?.type ?? "?";
    console.log(
      `  ${event.receivedAt.toISOString().slice(0, 19)}  ${event.status.padEnd(9)} att:${event.attempts}  co:${event.companyId ?? "-"}  ${type.padEnd(32)} ${event.eventId}`,
    );
    if (event.lastError) console.log(`      error: ${event.lastError}`);
  }

  const stuck = await db.webhookEvent.count({
    where: {
      gateway: "PLATFORM_STRIPE",
      status: { in: ["PENDING", "FAILED"] },
    },
  });
  console.log(
    `\n${stuck === 0 ? "OK" : "ATTENTION"}: ${stuck} platform billing event(s) not PROCESSED\n`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

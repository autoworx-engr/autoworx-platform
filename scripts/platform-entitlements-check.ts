/**
 * Reports what a company actually gets, by calling the real
 * entitlement-service the app uses — not a reimplementation of its rules.
 *
 * `@/lib/db` imports "server-only", which resolves to an empty module under
 * the react-server condition, so this must run with that condition set:
 *
 *   npx tsx --conditions=react-server scripts/platform-entitlements-check.ts 24
 *   npx tsx --conditions=react-server scripts/platform-entitlements-check.ts 24 --simulate
 *
 * --simulate walks the subscription through every PlatformSubscriptionStatus,
 * reports entitlements at each, then restores the original status. Local test
 * data only — it writes to the subscription row.
 */
import { PlatformSubscriptionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canAddAutomationRule,
  getCompanyEntitlements,
  type AutomationModuleKey,
  type Entitlements,
} from "@/lib/platform-billing/entitlement-service";

const companyId = Number(process.argv[2]);
const simulate = process.argv.includes("--simulate");

if (!companyId) {
  console.error(
    "usage: npx tsx --conditions=react-server scripts/platform-entitlements-check.ts <companyId> [--simulate]",
  );
  process.exit(1);
}

const FEATURE_KEYS = [
  "canUseSms",
  "canUseVoice",
  "callRecording",
  "missedCallTextBack",
  "carWrapVisualizer",
  "aiSmartReplies",
  "awxSalesAgent",
] as const;

const LIMIT_KEYS = [
  ["automationLimitPipeline", "pipeline"],
  ["automationLimitCommunication", "communication"],
  ["automationLimitInvoice", "invoice"],
  ["automationLimitMarketing", "marketing"],
] as const;

function summarize(entitlements: Entitlements) {
  const on = FEATURE_KEYS.filter((key) => entitlements[key]);
  const off = FEATURE_KEYS.filter((key) => !entitlements[key]);
  return { on, off };
}

function describeLimit(value: number) {
  if (value === -1) return "unlimited";
  if (value === 0) return "blocked";
  return String(value);
}

async function report(label: string) {
  const entitlements = await getCompanyEntitlements(companyId);
  const { on, off } = summarize(entitlements);

  console.log(`\n${label}`);
  console.log(`  granted   ${on.length ? on.join(", ") : "(nothing)"}`);
  console.log(`  blocked   ${off.length ? off.join(", ") : "(nothing)"}`);
  console.log(
    `  modules   ${entitlements.automationModules.length ? entitlements.automationModules.join(", ") : "(none)"}`,
  );
  for (const [limitKey, moduleKey] of LIMIT_KEYS) {
    const limit = entitlements[limitKey];
    // The real gate the automation screens call, at the limit and past it.
    const atLimit = await canAddAutomationRule(
      companyId,
      limit === -1 ? 9999 : Math.max(0, limit - 1),
      moduleKey as AutomationModuleKey,
    );
    const overLimit = await canAddAutomationRule(
      companyId,
      limit === -1 ? 999999 : limit,
      moduleKey as AutomationModuleKey,
    );
    console.log(
      `  ${moduleKey.padEnd(14)} limit ${describeLimit(limit).padEnd(9)} canAdd(one below)=${String(atLimit).padEnd(5)} canAdd(at limit)=${overLimit}`,
    );
  }
  return entitlements;
}

async function main() {
  const subscription = await db.platformSubscription.findUnique({
    where: { companyId },
    include: {
      plan: { select: { name: true } },
      company: { select: { name: true, enforcePlatformPlan: true } },
    },
  });
  const company =
    subscription?.company ??
    (await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, enforcePlatformPlan: true },
    }));

  if (!company) {
    console.error(`No company ${companyId}`);
    process.exit(1);
  }

  console.log(`company ${companyId} — ${company.name}`);
  console.log(
    `mode          ${company.enforcePlatformPlan ? "platform plan" : "LEGACY (feature permissions, subscription ignored)"}`,
  );
  console.log(
    `subscription  ${subscription ? `${subscription.plan?.name} — ${subscription.status}` : "none"}`,
  );

  await report(`AS STORED (${subscription?.status ?? "no subscription"})`);

  if (!simulate) return;

  if (!subscription) {
    console.log("\n--simulate needs an existing subscription row.");
    return;
  }

  const original = subscription.status;
  const statuses = Object.values(PlatformSubscriptionStatus);

  try {
    for (const status of statuses) {
      await db.platformSubscription.update({
        where: { companyId },
        data: { status },
      });
      await report(`SIMULATED ${status}`);
    }
  } finally {
    await db.platformSubscription.update({
      where: { companyId },
      data: { status: original },
    });
    console.log(`\nrestored status to ${original}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

/**
 * Environment-aware guard for outbound SMS.
 *
 * Outside production we must NOT blast real messages to seed/test/garbage
 * numbers — doing so damages the Twilio account's reputation and can get the
 * number or subaccount flagged/banned (e.g. error 30006 from landlines and
 * non-SMS-capable numbers). In local + staging we therefore send ONLY to
 * numbers explicitly listed in SMS_TEST_ALLOWLIST; every other recipient is
 * skipped. Callers keep persisting their DB rows, so the in-app conversation
 * UI still behaves normally — only the provider network call is suppressed.
 *
 * Production behavior is unchanged: everything is allowed.
 *
 * The same restriction also applies IN production to known test/QA accounts,
 * because those companies are exercised with fake/invalid numbers and would
 * otherwise generate real 30006 errors against the live account.
 *
 * Config:
 *   APP_ENV = development | staging | preview   -> treated as non-production
 *             (plain local `next dev` is non-production too; set per Railway env)
 *   SmsTestConfig.allowlist (DB, single row)    -> comma-separated test-safe
 *             numbers; the only recipients allowed while restricted.
 *
 * Test accounts are marked in the database via Company.isTest = true; those
 * companies are restricted even in production.
 */
import { db } from "@/lib/db";

export type SmsGuardResult = { allowed: boolean; reason?: string };

/** Digits only, last 10 (US), for tolerant +1 / formatting-agnostic matching. */
function normalizeForCompare(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "").slice(-10);
}

/**
 * True only in the real production deployment. NODE_ENV is unreliable here:
 * Railway staging runs a production build, so NODE_ENV === "production" there
 * too. APP_ENV is the explicit deployment signal and wins when set.
 */
export function isProductionRuntime(): boolean {
  const appEnv = (process.env.APP_ENV || "").trim().toLowerCase();
  if (appEnv) return appEnv === "production";
  return process.env.NODE_ENV === "production";
}

async function getAllowlist(): Promise<Set<string>> {
  const config = await db.smsTestConfig.findFirst({
    select: { allowlist: true },
  });
  return new Set(
    (config?.allowlist || "")
      .split(",")
      .map((n) => normalizeForCompare(n))
      .filter((n) => n.length > 0),
  );
}

async function isTestCompany(
  companyId: number | null | undefined,
): Promise<boolean> {
  if (companyId == null) return false;
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { isTest: true },
  });
  return company?.isTest ?? false;
}

/** Mask a number for safe logging — reveals only the last 4 digits. */
export function maskPhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length < 4 ? "***" : `***${digits.slice(-4)}`;
}

/**
 * Decide whether an outbound SMS to `to` may leave the current runtime.
 *
 * Sends are RESTRICTED when either the runtime is non-production OR the sending
 * company is a test account (Company.isTest). While restricted, a send is
 * allowed only when `to` is in SmsTestConfig.allowlist. Real production traffic
 * from real companies is always allowed.
 */
export async function guardOutboundSms(
  to: string | null | undefined,
  companyId?: number | null,
): Promise<SmsGuardResult> {
  const nonProd = !isProductionRuntime();
  // In non-production every send is already restricted, so skip the DB lookup.
  const testCompany = nonProd ? false : await isTestCompany(companyId);
  if (!nonProd && !testCompany) return { allowed: true };

  const target = normalizeForCompare(to);
  if (!target) return { allowed: false, reason: "empty-recipient" };

  const allowlist = await getAllowlist();
  if (allowlist.has(target)) return { allowed: true };

  const scope = nonProd ? "non-production" : "test-company";
  return {
    allowed: false,
    reason: allowlist.size
      ? `recipient-not-in-allowlist (${scope})`
      : `${scope}-and-allowlist-empty`,
  };
}

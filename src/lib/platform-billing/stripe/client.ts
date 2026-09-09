import "server-only";
import Stripe from "stripe";

// Pinned explicitly rather than left to the account default, per Stripe's own
// guidance — a new SDK major always ships alongside a new API major, so the
// pin and the installed `stripe` package version move together.
const PLATFORM_STRIPE_API_VERSION = "2026-07-29.dahlia";

function getPlatformStripeSecretKey(): string {
  const key = process.env.PLATFORM_STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Platform Stripe credentials not configured");
  }
  return key;
}

/**
 * Refuses to boot with a live/test key mismatch against PLATFORM_STRIPE_ENVIRONMENT.
 * Railway staging runs NODE_ENV=production, so live-ness must be opted into
 * explicitly and is never inferred from NODE_ENV. This check catches a live key
 * leaking into a non-production env (or vice versa) at boot instead of at first
 * charge.
 */
function assertKeyMatchesEnvironment(key: string): void {
  const explicit = (process.env.PLATFORM_STRIPE_ENVIRONMENT || "")
    .trim()
    .toLowerCase();
  const isLiveEnv = explicit === "production" || explicit === "live";
  const isLiveKey = key.startsWith("sk_live_");

  if (isLiveKey && !isLiveEnv) {
    throw new Error(
      "PLATFORM_STRIPE_SECRET_KEY is a live key but PLATFORM_STRIPE_ENVIRONMENT is not set to production/live.",
    );
  }
  if (!isLiveKey && isLiveEnv) {
    throw new Error(
      "PLATFORM_STRIPE_ENVIRONMENT is production/live but PLATFORM_STRIPE_SECRET_KEY is not a live key.",
    );
  }
}

let client: Stripe | null = null;

export function getPlatformStripeClient(): Stripe {
  if (!client) {
    const key = getPlatformStripeSecretKey();
    assertKeyMatchesEnvironment(key);
    client = new Stripe(key, { apiVersion: PLATFORM_STRIPE_API_VERSION });
  }
  return client;
}

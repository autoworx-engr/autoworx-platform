import "server-only";
import { getPlatformStripeClient } from "./client";

export async function createPlatformBillingPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  const stripe = getPlatformStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });
  return { url: session.url };
}

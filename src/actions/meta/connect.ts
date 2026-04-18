"use server";

import { getCompanyId } from "@/lib/companyId";
import { redirect } from "next/navigation";

const SCOPES = [
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_messages",
  "business_management",
].join(",");

/**
 * Server action that initiates the Meta (Facebook / Instagram) OAuth flow.
 *
 * Encodes the current company's ID in the `state` param so the callback route
 * can associate the OAuth response with the correct company without relying on
 * a session (the callback is a public route with no NextAuth session).
 *
 * After this redirect, Facebook shows a dialog where the user grants the
 * requested permissions and selects which Pages to allow access to. On
 * approval, Meta redirects to `META_OAUTH_REDIRECT_URI` (`/api/meta/callback`).
 *
 * Required scopes:
 * - `pages_messaging` — send/receive messages on behalf of the Page
 * - `pages_manage_metadata` — subscribe to Page webhook events
 * - `pages_read_engagement` — read Page engagement data
 * - `instagram_basic` — read basic Instagram profile info
 * - `instagram_manage_messages` — send/receive Instagram DMs
 * - `business_management` — enumerate Pages and Business accounts
 */
export async function initiateMetaConnect() {
  const companyId = await getCompanyId();

  // Encode companyId in state so the callback can look up the correct company.
  // base64url is safe in query strings without additional encoding.
  const state = Buffer.from(JSON.stringify({ companyId })).toString(
    "base64url",
  );

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_OAUTH_REDIRECT_URI!,
    scope: SCOPES,
    response_type: "code",
    state,
  });

  return redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
  );
}

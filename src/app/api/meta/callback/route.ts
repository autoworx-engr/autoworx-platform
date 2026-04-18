import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

const GRAPH = "https://graph.facebook.com/v21.0";

// ─── Shared payload types (used by callback + connectPage action) ─────────────

/**
 * A single Facebook Page returned by `/me/accounts`, with pre-fetched Instagram
 * Business Account info so the selection UI can render without additional API calls.
 */
export type MetaPageOption = {
  id: string;
  name: string;
  /** Facebook Page category (e.g. "Automotive", "Local business") */
  category: string;
  /** Page-level access token — encrypted before storage */
  access_token: string;
  instagramAccountId?: string;
  instagramUsername?: string;
};

/**
 * Payload encrypted and passed as a URL param to the page-selection screen.
 * Contains everything needed to finalise the connection for any page the user selects.
 */
export type MetaPendingPayload = {
  companyId: number;
  metaUserId: string;
  /** Long-lived user token (60-day) used to derive per-page tokens */
  longLivedToken: string;
  pages: MetaPageOption[];
};

// ─── OAuth callback ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     summary: Meta OAuth callback — exchanges code for tokens, collects pages, redirects to page selection
 *     description: |
 *       Flow:
 *       1. Exchanges `code` for a short-lived user access token
 *       2. Exchanges the short-lived token for a long-lived (60-day) token
 *       3. Calls `/me` to get the Meta user ID
 *       4. Calls `/me/accounts` to list all Facebook Pages the user manages
 *       5. For each page, pre-fetches the linked Instagram Business Account
 *       6. Encrypts the full payload and redirects to `/meta-select?data=…`
 *
 *       Token note: the short-lived token expires in ~1 hour; we immediately
 *       exchange it for a long-lived token (60 days). Page tokens derived from
 *       a long-lived user token are themselves long-lived and don't expire.
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       302:
 *         description: Redirects to page selection on success, or settings page with ?meta=cancelled|error
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = new URL(
    "/dashboard/settings/communications",
    process.env.NEXT_PUBLIC_APP_URL,
  );

  if (error || !code || !state) {
    settingsUrl.searchParams.set("meta", "cancelled");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const { companyId } = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { companyId: number };

    // 1. Exchange authorization code for short-lived user token (~1 hour)
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?${new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: process.env.META_OAUTH_REDIRECT_URI!,
        code,
      })}`,
    );
    const shortData = (await shortRes.json()) as {
      access_token?: string;
      error?: unknown;
    };
    if (!shortData.access_token) {
      console.error(
        "[meta/callback] Short-lived token exchange failed:",
        shortData.error,
      );
      throw new Error("Failed to get short-lived token");
    }

    // 2. Exchange short-lived token for long-lived token (~60 days).
    // Page access tokens derived from a long-lived user token never expire.
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?${new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: shortData.access_token,
      })}`,
    );
    const longData = (await longRes.json()) as {
      access_token?: string;
      error?: unknown;
    };
    if (!longData.access_token) {
      console.error(
        "[meta/callback] Long-lived token exchange failed:",
        longData.error,
      );
      throw new Error("Failed to get long-lived token");
    }
    const longLivedToken = longData.access_token;

    // 3. Get the Meta user ID (needed when storing credentials)
    const meRes = await fetch(`${GRAPH}/me?access_token=${longLivedToken}`);
    const meData = (await meRes.json()) as { id?: string; error?: unknown };
    if (!meData.id) {
      console.error("[meta/callback] /me call failed:", meData.error);
      throw new Error("Failed to get Meta user ID");
    }
    const metaUserId = meData.id;

    // 4. List all Pages this user manages, including the page access token
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,category,access_token&access_token=${longLivedToken}`,
    );
    const pagesData = (await pagesRes.json()) as {
      data?: Array<{
        id: string;
        name: string;
        category: string;
        access_token: string;
      }>;
      error?: unknown;
    };
    if (!pagesData.data?.length) {
      console.error(
        "[meta/callback] /me/accounts returned no pages:",
        pagesData.error,
      );
      throw new Error("No Pages found");
    }

    // 5. For each page, pre-fetch Instagram Business Account info so the
    //    selection UI can show it without additional API calls.
    const pages: MetaPageOption[] = [];
    for (const page of pagesData.data) {
      const igRes = await fetch(
        `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
      );
      const igData = (await igRes.json()) as {
        instagram_business_account?: { id: string };
        error?: unknown;
      };

      let instagramAccountId: string | undefined;
      let instagramUsername: string | undefined;

      if (igData.instagram_business_account?.id) {
        instagramAccountId = igData.instagram_business_account.id;
        const igUserRes = await fetch(
          `${GRAPH}/${instagramAccountId}?fields=username&access_token=${page.access_token}`,
        );
        const igUserData = (await igUserRes.json()) as { username?: string };
        instagramUsername = igUserData.username;
      }

      pages.push({
        id: page.id,
        name: page.name,
        category: page.category ?? "",
        access_token: page.access_token,
        instagramAccountId,
        instagramUsername,
      });
    }

    // 6. Encrypt the full payload and redirect to the page selection screen.
    //    The data param is base64url-encoded so it's safe in a URL query string.
    const payload: MetaPendingPayload = {
      companyId,
      metaUserId,
      longLivedToken,
      pages,
    };
    const data = Buffer.from(encrypt(JSON.stringify(payload))).toString(
      "base64url",
    );

    const selectUrl = new URL(
      "/dashboard/settings/communications/meta-select",
      process.env.NEXT_PUBLIC_APP_URL,
    );
    selectUrl.searchParams.set("data", data);
    return NextResponse.redirect(selectUrl);
  } catch (err) {
    console.error(
      "[meta/callback] OAuth flow error:",
      err instanceof Error ? err.message : err,
    );
    settingsUrl.searchParams.set("meta", "error");
    return NextResponse.redirect(settingsUrl);
  }
}

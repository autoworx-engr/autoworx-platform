/* eslint-disable no-console */
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;
const SETTINGS_URL = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/communications`;

const STATE_COOKIE = "ig_oauth_state";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const returnedState = searchParams.get("state");

  // Verify CSRF state before doing anything else
  const storedState = req.cookies.get(STATE_COOKIE)?.value;
  const stateValid =
    returnedState && storedState && returnedState === storedState;

  const clearStateCookie = (res: NextResponse) => {
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (!stateValid) {
    return clearStateCookie(
      NextResponse.redirect(`${SETTINGS_URL}?ig_error=invalid_state`),
    );
  }

  if (error || !code) {
    return clearStateCookie(
      NextResponse.redirect(
        `${SETTINGS_URL}?ig_error=${encodeURIComponent(error ?? "access_denied")}`,
      ),
    );
  }

  try {
    const companyId = await getCompanyId();

    // 1. Exchange code for short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        }),
    );
    if (!tokenRes.ok) throw new Error("Failed to exchange code for token");
    const { access_token: shortLivedToken } = (await tokenRes.json()) as {
      access_token: string;
    };

    // 2. Upgrade to long-lived token (60-day)
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        }),
    );
    if (!longRes.ok) throw new Error("Failed to get long-lived token");
    const { access_token: longLivedToken } = (await longRes.json()) as {
      access_token: string;
    };

    // 3. Fetch Facebook Pages and their linked Instagram Business accounts
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?` +
        new URLSearchParams({
          fields:
            "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
          access_token: longLivedToken,
        }),
    );
    if (!pagesRes.ok) throw new Error("Failed to fetch pages");
    const pagesJson = await pagesRes.json();
    console.log("[ig/callback] /me/accounts raw:", JSON.stringify(pagesJson));

    const pages = (pagesJson.data ?? []) as {
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: {
        id: string;
        username?: string;
        profile_picture_url?: string;
      };
    }[];

    console.log(
      "[ig/callback] pages found:",
      pages.map((p) => ({
        pageId: p.id,
        name: p.name,
        hasInstagram: !!p.instagram_business_account,
        igId: p.instagram_business_account?.id,
        igUsername: p.instagram_business_account?.username,
      })),
    );

    if (!pages.length) {
      return clearStateCookie(
        NextResponse.redirect(`${SETTINGS_URL}?ig_error=no_pages_found`),
      );
    }

    let saved = 0;

    for (const page of pages) {
      const igAccount = page.instagram_business_account;
      if (!igAccount?.id) continue;

      const pageAccessToken = page.access_token;

      await db.instagramAccount.upsert({
        where: { companyId_igUserId: { companyId, igUserId: igAccount.id } },
        create: {
          companyId,
          igUserId: igAccount.id,
          username: igAccount.username ?? null,
          pageAccessToken,
          facebookPageId: page.id,
          pictureUrl: "/images/default.png",
          isActive: true,
          webhookSubscribed: false,
        },
        update: {
          username: igAccount.username ?? null,
          pageAccessToken,
          facebookPageId: page.id,
          pictureUrl: "/images/default.png",
          isActive: true,
        },
      });

      // Subscribe the Facebook Page to receive Instagram message webhooks
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps?` +
          new URLSearchParams({
            subscribed_fields: "messages,messaging_seen",
            access_token: pageAccessToken,
          }),
        { method: "POST" },
      );

      if (subRes.ok) {
        await db.instagramAccount.update({
          where: { companyId_igUserId: { companyId, igUserId: igAccount.id } },
          data: { webhookSubscribed: true },
        });
      }

      saved++;
    }

    if (saved === 0) {
      return clearStateCookie(
        NextResponse.redirect(`${SETTINGS_URL}?ig_error=no_instagram_accounts`),
      );
    }

    return clearStateCookie(
      NextResponse.redirect(`${SETTINGS_URL}?ig_success=1`),
    );
  } catch (err: any) {
    return clearStateCookie(
      NextResponse.redirect(
        `${SETTINGS_URL}?ig_error=${encodeURIComponent(err?.message ?? "unknown")}`,
      ),
    );
  }
}

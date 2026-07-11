import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`;
const SETTINGS_URL = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/communications`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${SETTINGS_URL}?meta_error=${encodeURIComponent(error ?? "access_denied")}`,
    );
  }

  try {
    const companyId = await getCompanyId();

    // 1. Exchange code for short-lived user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        }),
    );
    if (!tokenRes.ok) throw new Error("Failed to exchange code for token");
    const { access_token: shortLivedToken } = await tokenRes.json();

    // 2. Exchange for long-lived user access token (60-day)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        }),
    );
    if (!longRes.ok) throw new Error("Failed to get long-lived token");
    const { access_token: longLivedToken } = await longRes.json();

    // 3. Get pages managed by this user
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?` +
        new URLSearchParams({
          fields: "id,name,access_token,picture{url}",
          access_token: longLivedToken,
        }),
    );
    if (!pagesRes.ok) throw new Error("Failed to fetch pages");
    const { data: pages } = await pagesRes.json();

    if (!pages?.length) {
      return NextResponse.redirect(`${SETTINGS_URL}?meta_error=no_pages_found`);
    }

    // 4. Save each page + subscribe webhook
    for (const page of pages) {
      const pageAccessToken: string = page.access_token;

      await db.facebookPage.upsert({
        where: { companyId_pageId: { companyId, pageId: page.id } },
        create: {
          companyId,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken,
          pictureUrl: "/images/default.png",
          isActive: true,
          webhookSubscribed: false,
        },
        update: {
          pageName: page.name,
          pageAccessToken,
          pictureUrl: "/images/default.png",
          isActive: true,
        },
      });

      // Subscribe the page to our webhook
      const subRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}/subscribed_apps?` +
          new URLSearchParams({
            subscribed_fields:
              "messages,messaging_postbacks,message_deliveries",
            access_token: pageAccessToken,
          }),
        { method: "POST" },
      );

      if (subRes.ok) {
        await db.facebookPage.update({
          where: { companyId_pageId: { companyId, pageId: page.id } },
          data: { webhookSubscribed: true },
        });
      }
    }

    return NextResponse.redirect(`${SETTINGS_URL}?meta_success=1`);
  } catch (err: any) {
    console.error("[meta/callback]", err);
    return NextResponse.redirect(
      `${SETTINGS_URL}?meta_error=${encodeURIComponent(err?.message ?? "unknown")}`,
    );
  }
}

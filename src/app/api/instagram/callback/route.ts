import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;
const SETTINGS_URL = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/communications`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${SETTINGS_URL}?ig_error=${encodeURIComponent(error ?? "access_denied")}`,
    );
  }

  try {
    const companyId = await getCompanyId();

    // 1. Exchange code for short-lived Instagram User Access Token
    // Instagram Business Login uses api.instagram.com, not graph.facebook.com
    const tokenBody = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code,
    });
    const tokenRes = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody.toString(),
      },
    );
    if (!tokenRes.ok) {
      throw new Error("Failed to exchange code for token");
    }
    const { access_token: shortLivedToken, user_id: igUserIdRaw } =
      (await tokenRes.json()) as { access_token: string; user_id: number };

    const igUserId = String(igUserIdRaw);

    // 2. Exchange for long-lived token (60-day) via graph.instagram.com
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?` +
        new URLSearchParams({
          grant_type: "ig_exchange_token",
          client_secret: META_APP_SECRET,
          access_token: shortLivedToken,
        }),
    );
    if (!longRes.ok) {
      throw new Error("Failed to get long-lived token");
    }
    const { access_token: longLivedToken } = (await longRes.json()) as {
      access_token: string;
    };

    // 3. Get Instagram profile info
    const profileRes = await fetch(
      `https://graph.instagram.com/me?` +
        new URLSearchParams({
          fields: "id,username,profile_picture_url",
          access_token: longLivedToken,
        }),
    );
    const profile = profileRes.ok
      ? ((await profileRes.json()) as {
          id: string;
          username?: string;
          profile_picture_url?: string;
        })
      : null;

    // 4. Upsert InstagramAccount — pageAccessToken field stores the IG user access token
    await db.instagramAccount.upsert({
      where: { companyId_igUserId: { companyId, igUserId } },
      create: {
        companyId,
        igUserId,
        username: profile?.username ?? null,
        pageAccessToken: longLivedToken,
        facebookPageId: null,
        pictureUrl: profile?.profile_picture_url ?? null,
        isActive: true,
        webhookSubscribed: false,
      },
      update: {
        username: profile?.username ?? null,
        pageAccessToken: longLivedToken,
        pictureUrl: profile?.profile_picture_url ?? null,
        isActive: true,
      },
    });

    // 5. Subscribe this IG account to receive message webhooks
    const subRes = await fetch(
      `https://graph.instagram.com/v19.0/${igUserId}/subscribed_apps?` +
        new URLSearchParams({
          subscribed_fields: "messages",
          access_token: longLivedToken,
        }),
      { method: "POST" },
    );

    if (subRes.ok) {
      await db.instagramAccount.update({
        where: { companyId_igUserId: { companyId, igUserId } },
        data: { webhookSubscribed: true },
      });
    }

    return NextResponse.redirect(`${SETTINGS_URL}?ig_success=1`);
  } catch (err: any) {
    console.error("[instagram/callback]", err);
    return NextResponse.redirect(
      `${SETTINGS_URL}?ig_error=${encodeURIComponent(err?.message ?? "unknown")}`,
    );
  }
}

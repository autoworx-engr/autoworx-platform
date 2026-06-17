import { NextResponse } from "next/server";

const META_APP_ID = process.env.META_APP_ID!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

// Instagram Business Login scopes (new API — replaces old facebook OAuth dialog)
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
].join(",");

export async function GET() {
  if (!META_APP_ID) {
    return NextResponse.json(
      { error: "META_APP_ID is not configured" },
      { status: 500 },
    );
  }

  // Instagram Business Login OAuth — shows Instagram login, not Facebook
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}

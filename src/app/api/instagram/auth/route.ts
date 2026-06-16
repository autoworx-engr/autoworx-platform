import { NextResponse } from "next/server";

const META_APP_ID = process.env.META_APP_ID!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

// instagram_manage_messages requires Meta App Review before going live
const SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
].join(",");

export async function GET() {
  if (!META_APP_ID) {
    return NextResponse.json(
      { error: "META_APP_ID is not configured" },
      { status: 500 },
    );
  }

  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}

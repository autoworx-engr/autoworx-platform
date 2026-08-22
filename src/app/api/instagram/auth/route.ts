import { NextResponse } from "next/server";

const META_APP_ID = process.env.META_APP_ID!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

// Scopes for Instagram DM access via Facebook OAuth dialog (graph.facebook.com)
// instagram_business_* scopes are ONLY for https://www.instagram.com/oauth/authorize
const SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
].join(",");

const STATE_COOKIE = "ig_oauth_state";

export async function GET() {
  if (!META_APP_ID) {
    return NextResponse.json(
      { error: "META_APP_ID is not configured" },
      { status: 500 },
    );
  }

  // Generate a cryptographically random state for CSRF protection
  const state = crypto.randomUUID();

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  // Store state in HTTP-only cookie — verified in /api/instagram/callback
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes — enough time to complete OAuth
    path: "/",
  });

  return response;
}

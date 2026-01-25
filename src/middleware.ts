import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse, URLPattern } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/"];

const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh-token",
  "/api/auth/providers",
  "/api/auth/signin",
  "/api/auth/callback/credentials",
  "/api/auth/csrf",
  // Webhook endpoints
  "/api/stripe/invoice-pay-hook",
  "/api/twilio/token",
  "/api/twilio/register-voip",
  "/api/infobip",
  "/api/lead-generate",
  "/api/authorize-net/webhook",
  "/api/infobip/mms/receive",
  "/api/infobip/email/receive",
  "/api/twilio/call-recording",
  "/api/twilio/call-state",
  "/api/twilio/call-status",
  "/api/twilio/incoming",
  "/api/twilio/receive",
  "/api/twilio/token",
  "/api/invoice/track-view",
];

const PUBLIC_DYNAMIC_API_ROUTES = [
  "/api/infobip/sms/receive/:companyIds",
  "/api/twilio/sms-receive/:companyIds",
  "/api/twilio/call-recording/:recordingSid",
];

const isDynamicPublicApiRoute = (pathname: string) => {
  const isPublic = PUBLIC_DYNAMIC_API_ROUTES.some(route => {
    const pattern = new URLPattern({ pathname: route });
    return pattern.test({ pathname: pathname });
  });
  return isPublic;
};

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  const authHeader = request.headers.get("authorization");
  // console.log({
  //   isDynamicPublicApiRoute: isDynamicPublicApiRoute(pathname),
  //   publicApiRoute: PUBLIC_API_ROUTES.includes(pathname),
  // });
  const isExternalApiRequest =
    !token &&
    pathname.startsWith("/api/") &&
    !(
      isDynamicPublicApiRoute(pathname) || PUBLIC_API_ROUTES.includes(pathname)
    );

  // console.log("Middleware - isExternalApiRequest:", isExternalApiRequest);
  // console.log("Middleware - Authorization Header:", authHeader);
  // console.log("Middleware - Request Pathname:", pathname);

  // check api access token
  if (!authHeader && isExternalApiRequest) {
    return NextResponse.json({
      status: 401,
      message: "Invalid or expired access token.",
    });
  } else if (authHeader && isExternalApiRequest) {
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;
    try {
      const secret = new TextEncoder().encode(process.env.ACCESS_SECRET || "");

      // 2. Verify Token
      const verifyToken = await jwtVerify(accessToken, secret);
      const expires = (verifyToken?.payload?.exp ?? 0) * 1000;
      if (Date.now() < (expires as number)) {
        return NextResponse.next();
      }
      throw new Error("Token expired");
    } catch (err) {
      console.error("Invalid API access token:", err);
      return NextResponse.json({
        status: 401,
        message: "Invalid or expired access token.",
      });
    }
  }

  // If user is already logged in and tries to access login/register, redirect them
  if (token && PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};

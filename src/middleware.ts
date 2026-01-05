import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
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
  "/api/infobip",
  "/api/lead-generate",
  "/api/authorize-net/webhook",
];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  const authHeader = request.headers.get("authorization");
  const isExternalApiRequest =
    !token &&
    pathname.startsWith("/api/") &&
    !PUBLIC_API_ROUTES.includes(pathname);

  console.log("Middleware - isExternalApiRequest:", isExternalApiRequest);
  console.log("Middleware - Authorization Header:", authHeader);
  console.log("Middleware - Request Pathname:", pathname);

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

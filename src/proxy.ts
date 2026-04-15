import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_API_ROUTES, PUBLIC_ROUTES } from "./constants/public-route";
import { jwtVerifyToken } from "./lib/jwtVerify";
import { isDynamicPublicApiRoute } from "./utils/isDynamicPublicApiRoute";
import { rootDomain } from "./lib/subdomains";

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Local development environment
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    // Try to extract subdomain from the full URL
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    // Fallback to host header approach
    if (hostname.includes(".localhost")) {
      return hostname.split(".")[0];
    }

    return null;
  }

  // Production environment
  const rootDomainFormatted = rootDomain.split(":")[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  const authHeader = request.headers.get("authorization");
  const isExternalApiRequest =
    !token &&
    pathname.startsWith("/api/") &&
    !(
      isDynamicPublicApiRoute(pathname) || PUBLIC_API_ROUTES.includes(pathname)
    );

  const subdomain = extractSubdomain(request);

  if (subdomain) {
    // Block access to admin page from subdomains
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Skip API routes so they can be handled by the main app API handlers
    if (!pathname.startsWith("/api/")) {
      // Rewrite all other paths to the subdomain folder
      return NextResponse.rewrite(
        new URL(
          `/subdomain/${subdomain}${pathname === "/" ? "" : pathname}`,
          request.url,
        ),
      );
    }
  }

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
      // 2. Verify Token
      const verifyToken = await jwtVerifyToken(accessToken);
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_API_ROUTES, PUBLIC_ROUTES } from "./constants/public-route";
import { jwtVerifyToken } from "./lib/jwtVerify";
import { isDynamicPublicApiRoute } from "./utils/isDynamicPublicApiRoute";
import { rootDomain } from "./lib/subdomains";
import { asyncLocalStorage } from "./middleware/requestId";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Generate a request ID (matches UUID v4 format)
 */
function generateRequestId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;

  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Local development environment
  if (
    !isProduction &&
    (url.includes("localhost") || url.includes("127.0.0.1"))
  ) {
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

  // Prefixes that should not be treated as tenant subdomains
  const ignoredSubdomains = ["www", "dev", "stage"];

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    !ignoredSubdomains.some(
      (sub) => hostname === `${sub}.${rootDomainFormatted}`,
    ) &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

export async function proxy(request: NextRequest) {
  // Get or generate request ID
  const incomingRequestId = request.headers.get("x-request-id");
  const requestId = incomingRequestId || generateRequestId();

  // Set up AsyncLocalStorage context
  const context = {
    requestId,
    route: request.nextUrl.pathname,
    method: request.method,
    url: request.url,
    userId: undefined as string | undefined,
  };

  // Extract userId from token if available
  const token = (await getToken({ req: request })) as {
    payload?: Record<string, unknown>;
  } | null;
  if (token?.payload?.userId || token?.payload?.sub) {
    context.userId =
      ((token.payload?.userId ?? token.payload?.sub) as string) || undefined;
  }

  return asyncLocalStorage.run(context, async () => {
    const { pathname } = request.nextUrl;
    const isPublicAssetRequest = /\.[a-zA-Z0-9]+$/.test(pathname);

    const authHeader = request.headers.get("authorization");
    const isExternalApiRequest =
      !token &&
      pathname.startsWith("/api/") &&
      !(
        isDynamicPublicApiRoute(pathname) ||
        PUBLIC_API_ROUTES.includes(pathname)
      );

    const subdomain = extractSubdomain(request);

    if (subdomain) {
      // Block access to admin page from subdomains
      if (pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/", request.url));
      }

      // Important: keep static/public files (e.g. /IFrameCommunicator.html)
      // on the original path so third-party iframes can load them.
      if (isPublicAssetRequest) {
        return NextResponse.next();
      }

      // Skip API routes so they can be handled by the main app API handlers
      if (!pathname.startsWith("/api/")) {
        const rewriteUrl = `/subdomain/${subdomain}${pathname === "/" ? "" : pathname}`;
        // Rewrite all other paths to the subdomain folder
        return NextResponse.rewrite(new URL(rewriteUrl, request.url));
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

    const response = NextResponse.next();

    // Attach request ID to response for client correlation
    response.headers.set("x-request-id", requestId);

    return response;
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

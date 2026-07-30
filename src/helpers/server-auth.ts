import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { generateAccessToken } from "@/lib/tokenGenerator";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import "server-only";

/**
 * Get the access token to authenticate an outbound server-side call, in
 * priority order:
 *  1. The Authorization header of the request currently being handled
 *     (Bearer token from mobile, or any caller that sent one). Next.js
 *     keeps request headers available via next/headers() anywhere in the
 *     same request's call chain (route handler -> server action -> service),
 *     so this correctly forwards the real caller's token instead of
 *     re-deriving auth.
 *  2. The NextAuth session (web dashboard, cookie-based).
 *  3. A freshly minted token for a company admin — last resort for
 *     contexts with no live request/session (e.g. cron jobs), only used
 *     when a fallbackCompanyId is supplied.
 */
export async function getServerAccessToken(
  fallbackCompanyId?: number,
): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    const authHeader = requestHeaders.get("authorization");
    if (authHeader) {
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : authHeader.trim();
      if (token) return token;
    }
  } catch {
    // headers() throws outside a request scope (e.g. background job)
  }

  try {
    const session = await getServerSession(authOptions);
    if (session?.accessToken) return session.accessToken;
  } catch (error) {
    console.error("Failed to get server session:", error);
  }

  if (fallbackCompanyId) {
    const admin = await db.user.findFirst({
      where: { companyId: fallbackCompanyId, employeeType: "Admin" },
    });
    if (admin) return generateAccessToken(admin);
  }

  return null;
}

/**
 * Get authorization headers for server-side API calls
 * Returns headers object with Authorization header if token exists
 */
export async function getServerAuthHeaders(
  fallbackCompanyId?: number,
): Promise<Record<string, string>> {
  const token = await getServerAccessToken(fallbackCompanyId);

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }

  return baseHeaders;
}

/**
 * Create axios config with authentication for server-side requests
 */
export async function createServerAxiosConfig(
  additionalHeaders?: Record<string, string>,
) {
  const authHeaders = await getServerAuthHeaders();

  return {
    headers: {
      ...authHeaders,
      ...additionalHeaders,
    },
  };
}

import { authOptions } from "@/authOptions";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

export type AuthPrincipal = {
  companyId: number;
  userId: number;
};

// Backwards compat
export type MobileAuthPrincipal = AuthPrincipal;

/**
 * Resolve the caller's principal (companyId + userId).
 *
 * Tries in order:
 *  1. Mobile JWT Bearer token (Authorization header)
 *  2. NextAuth session (dashboard cookies)
 *
 * Returns null if neither is present/valid.
 */
export async function getAuthPrincipal(
  request: NextRequest | Request,
): Promise<AuthPrincipal | null> {
  // 1. Bearer token (mobile)
  const auth =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const { payload } = await jwtVerifyToken(token);
      const companyId = payload.companyId;
      const userId = payload.id;
      if (typeof companyId === "number" && typeof userId === "number") {
        return { companyId, userId };
      }
    } catch {
      // fall through to session check
    }
  }

  // 2. NextAuth session (web dashboard)
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.companyId as number | undefined;
    const userId = session?.user?.id;
    const userIdNum =
      typeof userId === "number" ? userId : userId ? Number(userId) : NaN;
    if (typeof companyId === "number" && Number.isFinite(userIdNum)) {
      return { companyId, userId: userIdNum };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Convenience wrapper — returns just the companyId.
 */
export async function getCompanyIdFromBearer(
  request: NextRequest | Request,
): Promise<number | null> {
  const principal = await getAuthPrincipal(request);
  return principal?.companyId ?? null;
}

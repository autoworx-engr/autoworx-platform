import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { jwtVerifyToken } from "./jwtVerify";

export type AuthPrincipal = {
  companyId: number;
  userId: number;
};

// Backwards compat alias
export type MobileAuthPrincipal = AuthPrincipal;

/**
 * Resolve the calling principal from either a next-auth session (web cookie)
 * or a Bearer access token in the Authorization header (mobile / external).
 *
 * Tries Bearer first (cheaper, no DB), then NextAuth session.
 * Returns null when neither source is valid.
 */
export async function getAuthPrincipal(
  request: NextRequest | Request,
): Promise<AuthPrincipal | null> {
  // 1. Bearer token (mobile / external)
  const authHeader =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (authHeader) {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : authHeader.trim();
    if (token) {
      try {
        const { payload } = await jwtVerifyToken(token);
        const p = payload as {
          id?: number | string;
          companyId?: number | string;
          exp?: number;
        };
        if (p?.exp && Date.now() >= p.exp * 1000) return null;
        const companyId = Number(p.companyId);
        const userId = Number(p.id);
        if (Number.isFinite(companyId) && Number.isFinite(userId)) {
          return { companyId, userId };
        }
      } catch {
        // fall through to session check
      }
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

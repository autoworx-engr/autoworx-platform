import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { jwtVerifyToken } from "./jwtVerify";

export type AuthPrincipal = {
  companyId: number;
  userId: number;
};

/**
 * Resolve the calling principal from either a next-auth session (web cookie)
 * or a Bearer access token in the Authorization header (mobile / external).
 *
 * The Bearer payload is signed by tokenGenerator.generateAccessToken and
 * carries { id, companyId, ... }. Returns null when neither source is valid.
 */
export async function getAuthPrincipal(
  req: Request,
): Promise<AuthPrincipal | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.companyId) {
    return {
      companyId: Number(session.user.companyId),
      userId: Number(session.user.id),
    };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader.trim();
  if (!token) return null;

  try {
    const verified = await jwtVerifyToken(token);
    const payload = verified.payload as {
      id?: number | string;
      companyId?: number | string;
      exp?: number;
    };

    if (payload?.exp && Date.now() >= payload.exp * 1000) return null;

    const companyId = Number(payload.companyId);
    const userId = Number(payload.id);
    if (!Number.isFinite(companyId) || !Number.isFinite(userId)) return null;

    return { companyId, userId };
  } catch {
    return null;
  }
}

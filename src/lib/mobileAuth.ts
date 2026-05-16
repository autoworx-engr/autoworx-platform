import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest } from "next/server";

/**
 * Extracts companyId from a mobile JWT Bearer token.
 * Returns null if the header is absent, malformed, or verification fails.
 * Falls back to session-based auth in callers that need it.
 */
export async function getCompanyIdFromBearer(
  request: NextRequest,
): Promise<number | null> {
  const auth =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const { payload } = await jwtVerifyToken(token);
    const cid = payload.companyId;
    return typeof cid === "number" ? cid : null;
  } catch {
    return null;
  }
}

import { jwtVerifyToken } from "@/lib/jwtVerify";
import { NextRequest, NextResponse } from "next/server";

/**
 * Extracts and verifies the companyId from the Bearer JWT.
 * All JWT/token errors are normalised to "Unauthorized" so callers never
 * accidentally leak jose error messages (e.g. "JWTExpired") to clients.
 */
export async function extractCompanyId(request: NextRequest): Promise<number> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  try {
    const { payload } = await jwtVerifyToken(authHeader.slice(7));
    const companyId =
      typeof payload.companyId === "number" ? payload.companyId : 0;
    if (!companyId) throw new Error("Unauthorized");
    return companyId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg !== "Unauthorized") {
      console.error("[pipeline] JWT verification failed:", msg);
    }
    throw new Error("Unauthorized");
  }
}

/**
 * Consistent error response for all pipeline routes.
 * Internal error details are never forwarded to clients.
 */
export function pipelineError(
  error: unknown,
  fallback = "Internal server error",
): NextResponse {
  const isAuth = error instanceof Error && error.message === "Unauthorized";
  return NextResponse.json(
    { success: false, error: isAuth ? "Unauthorized" : fallback },
    { status: isAuth ? 401 : 500 },
  );
}

// ─── Shared validation helpers ────────────────────────────────────────────────

export const VALID_ORDER_FIELDS = [
  "createdAt",
  "updatedAt",
  "columnChangedAt",
] as const;

export type OrderField = (typeof VALID_ORDER_FIELDS)[number];

/** Returns the field name to sort by, defaulting to createdAt. */
export function parseOrderField(raw: string | null): OrderField {
  return (VALID_ORDER_FIELDS as readonly string[]).includes(raw ?? "")
    ? (raw as OrderField)
    : "createdAt";
}

/**
 * Clamps an integer param to [min, max]. Returns the default when the raw
 * string is missing, empty, or NaN.
 */
export function parseIntParam(
  raw: string | null,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (raw == null || raw === "") return defaultValue;
  const n = parseInt(raw, 10);
  if (isNaN(n)) return defaultValue;
  return Math.min(Math.max(n, min), max);
}

/** Trims and limits a search-term string to avoid runaway DB queries. */
export function sanitizeSearchTerm(
  raw: string | null,
  maxLength = 100,
): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().slice(0, maxLength);
  return trimmed || undefined;
}

/** Returns undefined when the date string is empty or not a valid date. */
export function parseDateParam(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : raw;
}

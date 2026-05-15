import { generateAccessToken } from "@/lib/tokenGenerator";
import { db } from "@/lib/db";

type InternalApiCallArgs<TBody = unknown> = {
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  userId: number;
  body?: TBody;
};

type InternalApiResult<TData = unknown> =
  | { ok: true; data: TData; status: number }
  | { ok: false; error: string; status: number };

/**
 * Calls an internal API route from server-side code (e.g., copilot tool handlers).
 *
 * Mints a short-lived JWT for the acting user via generateAccessToken, then
 * sends a Bearer-authed fetch to the internal endpoint. The internal route
 * verifies the JWT via getCompanyIdFromBearer / jwtVerifyToken.
 *
 * Why: all write operations go through API routes (Path 1 decision, May 2026)
 * so mobile + copilot share the same contract. Copilot mints a JWT for the
 * session user; mobile clients already have one from login.
 *
 * Never throws — always returns a structured result.
 */
export async function callInternalApi<TData = unknown, TBody = unknown>({
  method,
  path,
  userId,
  body,
}: InternalApiCallArgs<TBody>): Promise<InternalApiResult<TData>> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, error: "User not found", status: 401 };
  }

  const accessToken = generateAccessToken(user);

  const baseUrl =
    process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const status = response.status;
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Route returned non-JSON (e.g., empty 204); treat as empty
    }

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "message" in (payload as object)
          ? String((payload as { message: unknown }).message)
          : `Request failed with status ${status}`;
      return { ok: false, error: message, status };
    }

    return { ok: true, data: payload as TData, status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    };
  }
}

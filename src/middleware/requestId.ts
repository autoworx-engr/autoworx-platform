/**
 * Request ID Middleware
 * Generates or propagates a unique request ID for every request
 * Uses AsyncLocalStorage to make requestId available throughout the request lifecycle
 */

import { NextRequest, NextResponse } from "next/server";
import type { RequestContext } from "@/lib/logger";
import type { JWT } from "next-auth/jwt";

type RequestContextStore = {
  run<T>(store: RequestContext, callback: () => T): T;
  getStore(): RequestContext | undefined;
};

function createRequestContextStore(): RequestContextStore {
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const requireFn = Function("return require")() as (id: string) => {
        AsyncLocalStorage: new <T>() => RequestContextStore;
      };
      const { AsyncLocalStorage } = requireFn("node:async_hooks");
      return new AsyncLocalStorage<RequestContext>();
    } catch {
      // Fallback below for runtimes without node:async_hooks.
    }
  }

  let currentStore: RequestContext | undefined;

  return {
    run<T>(store: RequestContext, callback: () => T): T {
      const previousStore = currentStore;
      currentStore = store;
      try {
        const result = callback();
        if (result instanceof Promise) {
          return result.finally(() => {
            currentStore = previousStore;
          }) as T;
        }
        currentStore = previousStore;
        return result;
      } catch (error) {
        currentStore = previousStore;
        throw error;
      }
    },
    getStore(): RequestContext | undefined {
      return currentStore;
    },
  };
}

export const asyncLocalStorage = createRequestContextStore();

/**
 * Generate a short unique ID (UUID v4 style)
 */
function generateRequestId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extract user ID from token if available
 */
function extractUserId(token: JWT | null): string | undefined {
  if (!token) return undefined;
  const tokenWithUserId = token as JWT & { userId?: string };
  return tokenWithUserId.userId ?? tokenWithUserId.sub ?? undefined;
}

/**
 * Build the request context from the incoming request
 */
function buildRequestContext(
  req: NextRequest,
  requestId: string,
): RequestContext {
  const url = req.nextUrl.clone();

  return {
    requestId,
    route: url.pathname,
    method: req.method,
    url: req.url,
  };
}

/**
 * Middleware handler that wraps the Next.js route handler
 * Sets up AsyncLocalStorage context and ensures requestId is present
 */
export function withRequestId<
  T extends (req: NextRequest, ...args: unknown[]) => unknown,
>(handler: T): T {
  return (async (req: NextRequest, ...args: unknown[]) => {
    // Get or generate request ID
    const incomingRequestId = req.headers.get("x-request-id");
    const requestId = incomingRequestId || generateRequestId();

    // Get token for user context (don't await here, just get the raw token)
    let userId: string | undefined;
    try {
      const { getToken } = await import("next-auth/jwt");
      const token = await getToken({ req });
      userId = extractUserId(token);
    } catch {
      // Token extraction is best-effort
    }

    const context = buildRequestContext(req, requestId);
    if (userId) {
      context.userId = userId;
    }

    // Run the handler within the AsyncLocalStorage context
    return asyncLocalStorage.run(context, () => {
      const response = handler(req, ...args) as ReturnType<T>;

      // If the handler returns a Response (or Promise<Response>), attach the requestId header
      if (response instanceof Promise) {
        return response.then((res) => {
          if (res instanceof NextResponse) {
            res.headers.set("x-request-id", requestId);
          }
          return res;
        });
      }

      if (response instanceof NextResponse) {
        response.headers.set("x-request-id", requestId);
      }

      return response;
    });
  }) as T;
}

/**
 * Get current requestId from AsyncLocalStorage
 */
export function getCurrentRequestId(): string | undefined {
  const store = asyncLocalStorage.getStore();
  return store?.requestId;
}

/**
 * Get full request context from AsyncLocalStorage
 */
export function getCurrentRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

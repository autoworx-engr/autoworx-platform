/**
 * Structured Logging Module
 * Provides request-scoped logging with Better Stack (Logtail) integration
 * Uses AsyncLocalStorage for requestId propagation
 */

export interface RequestContext {
  requestId: string;
  userId?: string;
  route?: string;
  method?: string;
  url?: string;
}

interface LogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  url?: string;
  [key: string]: unknown;
}

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

const asyncLocalStorage = createRequestContextStore();

const BETTER_STACK_URL = "https://in.logfire.io";

/**
 * Get the current request context from AsyncLocalStorage
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Run a callback within a request context (for API routes, server actions)
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return asyncLocalStorage.run(context, callback);
}

/**
 * Strip sensitive data from logs
 */
function sanitizeLogData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "authorization",
    "bearer",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "cookie",
    "set-cookie",
    "creditCard",
    "cardNumber",
    "cvv",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = "***REDACTED***";
    } else if (typeof value === "string") {
      sanitized[key] = value
        .replace(
          /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
          "Bearer ***",
        )
        .replace(/(api[_-]?key)[=:]\s*["']?[\w\-]+["']?/gi, "$1=***");
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Build a structured log entry with request context
 */
function buildLogEntry(
  level: LogEntry["level"],
  message: string,
  extra: Record<string, unknown> = {},
): LogEntry {
  const context = getRequestContext();

  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId,
    userId: context?.userId,
    route: context?.route,
    method: context?.method,
    url: context?.url,
    ...sanitizeLogData(extra),
  };
}

/**
 * Send log to Better Stack via HTTP (no SDK needed)
 */
async function sendToBetterStack(entry: LogEntry): Promise<void> {
  const sourceToken = process.env.BETTER_STACK_SOURCE_TOKEN;

  if (!sourceToken) {
    // Fallback to console
    console.log(
      "[BetterStack] No token configured, using console:",
      JSON.stringify(entry),
    );
    return;
  }

  try {
    const response = await fetch(`${BETTER_STACK_URL}/events/restricted`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sourceToken}`,
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      console.error(`[BetterStack] Failed to send log: ${response.status}`);
    }
  } catch (err) {
    console.error("[BetterStack] Error sending log:", err);
  }
}

/**
 * Core logging function - builds entry and sends to Better Stack
 */
function log(
  level: LogEntry["level"],
  message: string,
  extra: Record<string, unknown> = {},
): void {
  const entry = buildLogEntry(level, message, extra);

  // Always log to console
  const consoleMsg = `[${entry.level.toUpperCase()}] ${entry.message}`;
  if (level === "error" || level === "warn") {
    console[level](consoleMsg, entry);
  } else {
    console.log(consoleMsg, entry);
  }

  // Send to Better Stack asynchronously (fire-and-forget)
  sendToBetterStack(entry).catch(() => {});
}

export const logger = {
  info: (message: string, extra?: Record<string, unknown>) =>
    log("info", message, extra),
  warn: (message: string, extra?: Record<string, unknown>) =>
    log("warn", message, extra),
  error: (message: string, extra?: Record<string, unknown>) =>
    log("error", message, extra),
  debug: (message: string, extra?: Record<string, unknown>) =>
    log("debug", message, extra),
};

/**
 * Client-side error reporter (used by error.tsx)
 */
export async function logClientError(params: {
  message: string;
  stack?: string;
  route?: string;
  userId?: string;
  requestId?: string;
}): Promise<void> {
  const entry: LogEntry = {
    level: "error",
    message: params.message,
    timestamp: new Date().toISOString(),
    requestId: params.requestId ?? "client",
    userId: params.userId ?? "anonymous",
    route: params.route ?? "client",
    method: "CLIENT",
    url: typeof window !== "undefined" ? window.location.href : "unknown",
    stack: params.stack,
    source: "frontend_error_boundary",
  };

  console.error("[Client Error]", entry);

  try {
    const sourceToken = process.env.BETTER_STACK_SOURCE_TOKEN;
    if (!sourceToken) return;

    await fetch(`${BETTER_STACK_URL}/events/restricted`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sourceToken}`,
      },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.error("[Client Error] Failed to send to BetterStack:", err);
  }
}

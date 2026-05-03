/**
 * Telegram Error Handler
 * Enhanced error handler that sends formatted alerts to Telegram
 * Integrates with the deduplication system to prevent spam
 */

import { errorHandler } from "./globalErrorHandler";
import { TErrorHandler } from "@/types/globalError";
import { sendTelegramAlert, formatTelegramErrorMessage } from "@/lib/telegram";
import {
  generateErrorFingerprint,
  shouldSendAlert,
  recordError,
} from "@/lib/errorDeduplication";
import { getCurrentRequestContext } from "@/middleware/requestId";

export interface TelegramErrorContext {
  route?: string;
  method?: string;
  requestUrl?: string;
  userId?: string | null;
  eventName?: string;
}

/**
 * Derive an event name from the route path
 */
function deriveEventName(route: string, errorMessage: string): string {
  // Remove leading slash and replace slashes with underscores
  const pathParts = route.replace(/^\//, "").replace(/\//g, "_");

  // Determine event type from error patterns
  const lowerMsg = errorMessage.toLowerCase();
  let eventSuffix = "error";

  if (
    lowerMsg.includes("payment") ||
    lowerMsg.includes("stripe") ||
    lowerMsg.includes("charge")
  ) {
    eventSuffix = "payment_error";
  } else if (
    lowerMsg.includes("auth") ||
    lowerMsg.includes("login") ||
    lowerMsg.includes("password") ||
    lowerMsg.includes("token")
  ) {
    eventSuffix = "auth_error";
  } else if (
    lowerMsg.includes("database") ||
    lowerMsg.includes("prisma") ||
    lowerMsg.includes("query")
  ) {
    eventSuffix = "database_error";
  } else if (lowerMsg.includes("validation") || lowerMsg.includes("zod")) {
    eventSuffix = "validation_error";
  } else if (
    lowerMsg.includes("network") ||
    lowerMsg.includes("fetch") ||
    lowerMsg.includes("axios")
  ) {
    eventSuffix = "network_error";
  } else if (lowerMsg.includes("timeout")) {
    eventSuffix = "timeout_error";
  }

  return `${pathParts}_${eventSuffix}`;
}

/**
 * Truncate stack trace to first 8 lines
 */
function truncateStack(stack: string | undefined | null, maxLines = 8): string {
  if (!stack) return "";
  const lines = stack.split("\n").filter((line) => line.trim());
  return lines.slice(0, maxLines).join("\n");
}

/**
 * Handle an error with Telegram alerting
 * Returns the same response as the standard errorHandler but triggers async Telegram alert
 */
export function telegramErrorHandler(
  error: unknown,
  context?: TelegramErrorContext,
): TErrorHandler {
  // Get standard error response
  const errorResponse = errorHandler(error);

  // Get request context from AsyncLocalStorage if not provided
  const requestContext = getCurrentRequestContext();

  const route = context?.route ?? requestContext?.route ?? "unknown";
  const method = context?.method ?? requestContext?.method ?? "UNKNOWN";
  const requestUrl = context?.requestUrl ?? requestContext?.url ?? "";
  const userId = context?.userId ?? requestContext?.userId ?? null;
  const requestId = requestContext?.requestId ?? generateFallbackRequestId();
  const eventName =
    context?.eventName ?? deriveEventName(route, errorResponse.message);

  // Generate error fingerprint for deduplication
  const errorFingerprint = generateErrorFingerprint({
    errorMessage: errorResponse.message,
    route,
  });

  // Check if we should send an alert (within deduplication window)
  if (shouldSendAlert(errorFingerprint)) {
    // Record this occurrence
    recordError(errorFingerprint);

    // Format and send Telegram alert (async, non-blocking)
    const telegramMessage = formatTelegramErrorMessage({
      errorMessage: errorResponse.message,
      route,
      method,
      requestUrl,
      eventName,
      userId,
      requestId,
      stack: truncateStack(errorResponse.stack),
    });

    // Fire-and-forget: don't await
    sendTelegramAlert(telegramMessage).catch((err) => {
      console.error("[TelegramErrorHandler] Failed to send alert:", err);
    });
  } else {
    // Log that we suppressed an alert (useful for debugging deduplication)
    console.log(
      `[TelegramErrorHandler] Suppressed duplicate alert for: ${errorFingerprint}`,
    );
  }

  return errorResponse;
}

/**
 * Generate a simple fallback requestId if none exists
 */
function generateFallbackRequestId(): string {
  return `noid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Wrapper for server actions that catches errors and sends Telegram alerts
 */
export async function withTelegramErrorHandler<T>(
  action: () => T,
  context?: TelegramErrorContext,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    telegramErrorHandler(error, context);
    throw error;
  }
}

/**
 * Wrapper for API route handlers
 * Usage: export const POST = withApiErrorHandler(async (req) => { ... })
 */
export function withApiErrorHandler<
  T extends (req: unknown, ...args: unknown[]) => unknown,
>(handler: T, context?: TelegramErrorContext): T {
  return (async (req: unknown, ...args: unknown[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      telegramErrorHandler(error, context);
      throw error;
    }
  }) as T;
}

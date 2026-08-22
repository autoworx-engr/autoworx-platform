/**
 * Fire-and-forget Telegram alerts for production server errors (5xx).
 * Used by globalErrorHandler, telegramErrorHandler, and instrumentation.
 */

import { sendTelegramAlert, formatTelegramErrorMessage } from "@/lib/telegram";
import {
  generateErrorFingerprint,
  shouldSendAlert,
  recordError,
} from "@/lib/errorDeduplication";
import { getCurrentRequestContext } from "@/middleware/requestId";

export interface ProductionTelegramContext {
  route?: string;
  method?: string;
  requestUrl?: string;
  userId?: string | null;
  eventName?: string;
}

function deriveEventName(route: string, errorMessage: string): string {
  const pathParts = route.replace(/^\//, "").replace(/\//g, "_");

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

function truncateStack(stack: string | undefined | null, maxLines = 8): string {
  if (!stack) return "";
  const lines = stack.split("\n").filter((line) => line.trim());
  return lines.slice(0, maxLines).join("\n");
}

function generateFallbackRequestId(): string {
  return `noid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Telegram 5xx alerts run in production by default.
 * Staging/preview deployments on Railway also run a production build
 * (NODE_ENV=production), so they are suppressed explicitly via APP_ENV to keep
 * the production alert channel free of non-prod noise. Set APP_ENV=staging
 * (or development/preview) on those Railway environments.
 * In local dev, set TELEGRAM_ALERTS_IN_DEV=true (or 1) to test.
 */
function telegramAlertsEnabledForCurrentEnv(): boolean {
  const appEnv = (process.env.APP_ENV || "").trim().toLowerCase();
  if (
    appEnv === "staging" ||
    appEnv === "development" ||
    appEnv === "preview"
  ) {
    return false;
  }
  if (process.env.NODE_ENV === "production") return true;
  const flag = process.env.TELEGRAM_ALERTS_IN_DEV;
  return flag === "true" || flag === "1";
}

/**
 * Queue a deduplicated Telegram alert (non-blocking). Server-only; 5xx only.
 */
export function queueProductionTelegramAlert(params: {
  errorMessage: string;
  statusCode: number;
  stack?: string | null;
  context?: ProductionTelegramContext;
}): void {
  if (typeof window !== "undefined") return;
  if (!telegramAlertsEnabledForCurrentEnv()) return;
  if (params.statusCode < 500) return;

  const requestContext = getCurrentRequestContext();

  const route = params.context?.route ?? requestContext?.route ?? "unknown";
  const method = params.context?.method ?? requestContext?.method ?? "UNKNOWN";
  const requestUrl = params.context?.requestUrl ?? requestContext?.url ?? "";
  const userId = params.context?.userId ?? requestContext?.userId ?? null;
  const requestId = requestContext?.requestId ?? generateFallbackRequestId();
  const eventName =
    params.context?.eventName ?? deriveEventName(route, params.errorMessage);

  const errorFingerprint = generateErrorFingerprint({
    errorMessage: params.errorMessage,
    route,
  });

  if (!shouldSendAlert(errorFingerprint)) {
    console.log(
      `[ProductionTelegram] Suppressed duplicate alert for: ${errorFingerprint}`,
    );
    return;
  }

  recordError(errorFingerprint);

  const telegramMessage = formatTelegramErrorMessage({
    errorMessage: params.errorMessage,
    route,
    method,
    requestUrl,
    eventName,
    userId,
    requestId,
    stack: truncateStack(params.stack ?? undefined),
  });

  sendTelegramAlert(telegramMessage).catch((err) => {
    console.error("[ProductionTelegram] Failed to send alert:", err);
  });
}

export function getUnknownErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

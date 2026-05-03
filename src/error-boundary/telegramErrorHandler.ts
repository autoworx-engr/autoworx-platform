/**
 * Telegram Error Handler
 * Enhanced error handler that sends formatted alerts to Telegram
 * Integrates with the deduplication system to prevent spam
 */

import { normalizeGlobalError } from "./globalErrorHandler";
import httpStatus from "http-status";
import { TErrorHandler } from "@/types/globalError";
import {
  queueProductionTelegramAlert,
  getUnknownErrorStack,
  type ProductionTelegramContext,
} from "./sendProductionTelegramAlert";

export type TelegramErrorContext = ProductionTelegramContext;

/**
 * Handle an error with Telegram alerting
 * Returns the same response as the standard errorHandler but triggers async Telegram alert
 */
export function telegramErrorHandler(
  error: unknown,
  context?: TelegramErrorContext,
): TErrorHandler {
  const errorResponse = normalizeGlobalError(error);

  queueProductionTelegramAlert({
    errorMessage: errorResponse.message,
    statusCode: errorResponse.statusCode ?? httpStatus.INTERNAL_SERVER_ERROR,
    stack: getUnknownErrorStack(error),
    context,
  });

  return errorResponse;
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

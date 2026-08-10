/**
 * Telegram Alert Module
 * Sends formatted error alerts to a Telegram chat via Bot API
 * Non-blocking: errors are caught and logged, never throw
 */

const TELEGRAM_API_URL = "https://api.telegram.org";

/** Escape dynamic text for Telegram parse_mode HTML (avoids API 400 on < > &). */
function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Chat ID for alerts from environment.
 */
export function resolveTelegramChatId(): string | undefined {
  return process.env.TELEGRAM_CHAT_ID?.trim();
}

interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: string;
    chat: { id: number; title: string; type: string };
    date: number;
    text: string;
  };
  description?: string;
}

/**
 * Strip sensitive data patterns from a string to prevent credential leaks
 */
function stripSensitiveData(text: string): string {
  if (!text) return text;

  return (
    text
      // Strip Bearer tokens
      .replace(
        /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
        "Bearer ***",
      )
      // Strip raw API keys (various patterns)
      .replace(
        /(api[_-]?key|apiKey|API_KEY|API_KEY)[=:]\s*["']?[\w\-]+["']?/gi,
        "$1=***",
      )
      // Strip passwords in URLs
      .replace(/:\/\/[^:]+:[^@]+@/g, "://***@")
      // Strip authorization headers
      .replace(
        /Authorization[=:]\s*["']?[A-Za-z0-9\-_\s]+["']?/gi,
        "Authorization: ***",
      )
      // Strip database URLs
      .replace(/postgres:\/\/[^@]+@/g, "postgres://***@")
      // Strip Stripe keys
      .replace(/sk_live_[A-Za-z0-9]+/g, "sk_live_***")
      .replace(/sk_test_[A-Za-z0-9]+/g, "sk_test_***")
      // Strip generic secret patterns
      .replace(/(secret|SECRET|Secret)[=:]\s*["']?[\w\-]+["']?/gi, "$1=***")
      // Strip JWT-like tokens (long base64 strings)
      .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "***")
  );
}

/**
 * Send a message to Telegram (fire-and-forget, never blocks)
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = resolveTelegramChatId();

  if (!botToken || !chatId) {
    console.warn("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.");
    return;
  }

  const sanitizedMessage = stripSensitiveData(message);
  const url = `${TELEGRAM_API_URL}/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: sanitizedMessage,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[Telegram] Failed to send alert: ${response.status} - ${errorBody}`,
      );
      return;
    }

    const data = (await response.json()) as TelegramSendMessageResponse;
    if (!data.ok) {
      console.error(`[Telegram] API error: ${data.description}`);
    }
  } catch (err) {
    // Never let Telegram errors propagate - log and continue
    console.error("[Telegram] Unexpected error sending alert:", err);
  }
}

/**
 * Format an error as a Telegram alert message
 */
export function formatTelegramErrorMessage(params: {
  errorMessage: string;
  route: string;
  method: string;
  requestUrl: string;
  eventName: string;
  userId: string | null;
  requestId: string;
  stack?: string;
}): string {
  const {
    errorMessage,
    route,
    method,
    requestUrl,
    eventName,
    userId,
    requestId,
    stack,
  } = params;

  const safeMsg = escapeTelegramHtml(stripSensitiveData(errorMessage));
  const safeRoute = escapeTelegramHtml(route);
  const safeMethod = escapeTelegramHtml(method);
  const safeUrl = escapeTelegramHtml(requestUrl);
  const safeEvent = escapeTelegramHtml(eventName);
  const safeUser = escapeTelegramHtml(userId ?? "N/A");
  const safeReqId = escapeTelegramHtml(requestId);

  const lines = [
    "\uD83D\uDEA8 Error Detected",
    "",
    `<b>Message:</b> ${safeMsg}`,
    `<b>Route:</b> ${safeRoute}`,
    `<b>Method:</b> ${safeMethod}`,
    `<b>URL:</b> ${safeUrl}`,
    `<b>Event:</b> ${safeEvent}`,
    `<b>User:</b> ${safeUser}`,
    `<b>RequestId:</b> <code>${safeReqId}</code>`,
    "",
  ];

  if (stack) {
    const truncatedStack = escapeTelegramHtml(
      stripSensitiveData(truncateStack(stack)),
    );
    lines.push(`<b>Stack:</b>`);
    lines.push(`<code>${truncatedStack}</code>`);
  }

  return lines.join("\n");
}

/**
 * Truncate stack trace to first 5 lines for Telegram message length limits
 */
function truncateStack(stack: string): string {
  if (!stack) return "";
  const lines = stack.split("\n").slice(0, 5);
  return lines.join("\n");
}

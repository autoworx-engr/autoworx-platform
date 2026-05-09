import { NextRequest, NextResponse } from "next/server";
import { sendTelegramAlert, formatTelegramErrorMessage } from "@/lib/telegram";
import {
  generateErrorFingerprint,
  shouldSendAlert,
  recordError,
} from "@/lib/errorDeduplication";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

interface ClientErrorBody {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

function deriveEventName(url: string, message: string): string {
  const pathParts = url.replace(/^\//, "").replace(/\//g, "_").slice(0, 50);
  const lowerMsg = message.toLowerCase();

  let eventSuffix = "frontend_error";
  if (lowerMsg.includes("payment")) eventSuffix = "frontend_payment_error";
  else if (lowerMsg.includes("auth") || lowerMsg.includes("login"))
    eventSuffix = "frontend_auth_error";
  else if (lowerMsg.includes("network") || lowerMsg.includes("fetch"))
    eventSuffix = "frontend_network_error";

  return `${pathParts}_${eventSuffix}`;
}

function truncateStack(stack: string | undefined, maxLines = 8): string {
  if (!stack) return "";
  const lines = stack
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, maxLines);
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClientErrorBody;
    const { message, stack, url, userAgent, timestamp } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Missing message" },
        { status: 400 },
      );
    }

    const requestId = req.headers.get("x-request-id") || uuidv4();
    const route = url ? new URL(url).pathname : "client";
    const eventName = deriveEventName(route, message);

    // Log to Better Stack
    logger.error("Client-side error reported", {
      source: "frontend_error_boundary",
      message,
      stack,
      route,
      eventName,
      requestId,
      url,
      userAgent,
      timestamp,
    });

    // Send Telegram alert if not duplicated
    const fingerprint = generateErrorFingerprint({
      errorMessage: message,
      route,
    });

    if (shouldSendAlert(fingerprint)) {
      recordError(fingerprint);

      const telegramMessage = formatTelegramErrorMessage({
        errorMessage: message,
        route,
        method: "CLIENT",
        requestUrl: url ?? "",
        eventName,
        userId: null,
        requestId,
        stack: truncateStack(stack),
      });

      // Fire-and-forget
      sendTelegramAlert(telegramMessage).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ClientError API] Unexpected error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

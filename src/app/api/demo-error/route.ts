import { NextRequest, NextResponse } from "next/server";
import { telegramErrorHandler } from "@/error-boundary/telegramErrorHandler";
const DEMO_ERRORS = [
  "Payment gateway timeout during checkout",
  "Database connection refused while fetching invoice",
  "Authorization token expired for protected resource",
  "Unhandled API exception in order processing",
  "Third-party webhook signature verification failed",
];
function pickRandomDemoError(): string {
  const index = Math.floor(Math.random() * DEMO_ERRORS.length);
  return DEMO_ERRORS[index];
}
/**
 * Demo route to test Telegram error alerts.
 * Call GET /api/demo-error and it will throw a random error.
 */
export async function GET(req: NextRequest) {
  try {
    const randomErrorMessage = pickRandomDemoError();
    throw new Error(randomErrorMessage);
  } catch (error) {
    const handled = telegramErrorHandler(error, {
      route: req.nextUrl.pathname,
      method: req.method,
      requestUrl: req.url,
      eventName: "demo_api_error",
    });
    return NextResponse.json(
      {
        ...handled,
        demo: true,
        note: "This error is intentionally generated to test Telegram alerts.",
      },
      { status: handled.statusCode || 500 },
    );
  }
}

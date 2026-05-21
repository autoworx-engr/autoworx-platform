/**
 * Node-only: process-level error hooks + background workers.
 * Loaded only from instrumentation.ts when NEXT_RUNTIME is nodejs
 * so Edge bundles never reference process.on.
 */

import { queueProductionTelegramAlert } from "./error-boundary/sendProductionTelegramAlert";
import { startWorker } from "./workers/smsAgentWorker";

// Start the pg-boss SMS agent worker inside the Next.js process.
// pg-boss polls PostgreSQL internally — no separate Railway service needed.
startWorker().catch((err) =>
  console.error("[Instrumentation] SMS agent worker failed to start:", err),
);

function notify(
  reason: unknown,
  label: "unhandledRejection" | "uncaughtException",
): void {
  const msg = reason instanceof Error ? reason.message : String(reason);
  queueProductionTelegramAlert({
    errorMessage: `[${label}] ${msg}`,
    statusCode: 500,
    stack: reason instanceof Error ? (reason.stack ?? null) : null,
    context: {
      route: `/_process/${label}`,
      method: "NODE",
      requestUrl: "",
      eventName: `process_${label}`,
    },
  });
}

process.on("unhandledRejection", (reason: unknown) => {
  notify(reason, "unhandledRejection");
});

process.on("uncaughtException", (err: Error) => {
  notify(err, "uncaughtException");
});

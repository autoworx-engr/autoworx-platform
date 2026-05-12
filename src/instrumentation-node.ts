/**
 * Node-only: process-level error hooks. Loaded only from instrumentation.ts when
 * NEXT_RUNTIME is nodejs so Edge bundles never reference process.on.
 */

import { queueProductionTelegramAlert } from "./error-boundary/sendProductionTelegramAlert";

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

/**
 * Node.js process-level handlers for errors that never reach route try/catch or errorHandler.
 * Runs only when NEXT_RUNTIME is nodejs (see Next.js instrumentation docs).
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { queueProductionTelegramAlert } =
    await import("./error-boundary/sendProductionTelegramAlert");

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
}

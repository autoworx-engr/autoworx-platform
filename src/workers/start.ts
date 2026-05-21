async function main() {
  // dotenv only needed locally; Railway injects env vars automatically
  if (process.env.NODE_ENV !== "production") {
    const { config } = await import("dotenv");
    config();
  }

  const { startWorker } = await import("./smsAgentWorker");
  await startWorker();
}

main().catch((err) => {
  console.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});

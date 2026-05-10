/**
 * Next.js instrumentation entry. Must stay Edge-safe: no process.on here.
 * Node process hooks live in instrumentation-node.ts (dynamic import).
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  await import("./instrumentation-node");
}

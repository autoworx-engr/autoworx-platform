const SOFT_LIMIT = 60;
const HARD_LIMIT = 120;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

type Window = { count: number; resetsAt: number };

const windows = new Map<number, Window>();

export type RateLimitResult =
  | { ok: true; warning?: string }
  | { ok: false; retryAfterMs: number };

export function checkRateLimit(userId: number): RateLimitResult {
  const now = Date.now();
  const w = windows.get(userId);

  if (!w || now >= w.resetsAt) {
    windows.set(userId, { count: 1, resetsAt: now + WINDOW_MS });
    return { ok: true };
  }

  w.count += 1;

  if (w.count > HARD_LIMIT) {
    return { ok: false, retryAfterMs: w.resetsAt - now };
  }

  if (w.count > SOFT_LIMIT) {
    return {
      ok: true,
      warning: `You've sent ${w.count} messages this hour. Limit resets in ${Math.ceil((w.resetsAt - now) / 60000)} min.`,
    };
  }

  return { ok: true };
}

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type WindowEntry = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;
  const store = new Map<string, WindowEntry>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, windowMs);

  if (cleanup.unref) cleanup.unref();

  function check(key: string): RateLimitResult {
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;

    const allowed = entry.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - entry.count);
    const retryAfterMs = allowed ? 0 : entry.resetAt - now;

    return { allowed, remaining, retryAfterMs };
  }

  return { check };
}

export function extractClientIp(
  forwardedFor: string | null,
  realIp: string | null,
): string {
  const trustedProxyCount = parseInt(
    process.env.TRUSTED_PROXY_COUNT ?? "1",
    10,
  );

  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((s) => s.trim());

    if (trustedProxyCount === 0) {
      return ips[0] ?? "unknown";
    }

    const clientIndex = ips.length - trustedProxyCount - 1;
    return ips[Math.max(0, clientIndex)] ?? ips[0] ?? "unknown";
  }

  return realIp ?? "unknown";
}

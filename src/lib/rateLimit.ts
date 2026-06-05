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

/**
 * Extracts the client IP from a request header string.
 *
 * X-Forwarded-For is a comma-separated chain written left-to-right:
 *   client, proxy1, proxy2
 *
 * When sitting behind a single trusted reverse proxy (e.g. Nginx, Vercel),
 * the LAST entry is the one our proxy appended and can be trusted.
 * The earlier entries are attacker-controlled and must NOT be used as the
 * rate-limit key — doing so allows trivial bypass by spoofing the header.
 *
 * Set TRUSTED_PROXY_COUNT in env to the number of proxies in front of
 * the app (default: 1). Use 0 only when the app is directly exposed.
 */
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
      // App is directly exposed — trust the leftmost (client) IP.
      return ips[0] ?? "unknown";
    }

    // Strip the last N entries added by our own proxy chain.
    // The entry just before them is the real client IP.
    const clientIndex = ips.length - trustedProxyCount - 1;
    return ips[Math.max(0, clientIndex)] ?? ips[0] ?? "unknown";
  }

  return realIp ?? "unknown";
}

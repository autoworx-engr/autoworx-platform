/**
 * Error Deduplication Module
 * Prevents the same error from triggering multiple Telegram alerts within a time window
 * Uses an in-memory Map with sliding window expiration
 */

interface DeduplicationEntry {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

/**
 * Generate a fingerprint for an error to identify duplicates
 */
export function generateErrorFingerprint(params: {
  errorMessage: string;
  route: string;
}): string {
  // Normalize the error message (trim, collapse whitespace)
  const normalizedMessage = params.errorMessage
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, 200); // Cap message length for fingerprint stability

  // Normalize route (remove dynamic segments like IDs)
  const normalizedRoute = params.route
    .replace(/\/[a-f0-9-]{36}/gi, "/[id]") // UUIDs
    .replace(/\/\d+/g, "/[id]") // Numeric IDs
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, "/[hash]"); // Long hashes

  return `${normalizedRoute}|${normalizedMessage}`;
}

/**
 * Check if an alert should be sent for this error
 * Returns true if this is the first occurrence in the window, or if enough time has passed
 */
export function shouldSendAlert(errorKey: string): boolean {
  return errorDeduplicator.shouldAlert(errorKey);
}

/**
 * Record that an error occurred (for counting)
 */
export function recordError(errorKey: string): void {
  errorDeduplicator.record(errorKey);
}

/**
 * The deduplication manager singleton
 */
class ErrorDeduplicator {
  private cache = new Map<string, DeduplicationEntry>();

  // 5-minute window in milliseconds
  private readonly WINDOW_MS = 5 * 60 * 1000;

  // After 10 minutes of no occurrences, clean up the entry
  private readonly CLEANUP_MS = 10 * 60 * 1000;

  /**
   * Check if an alert should be sent for this error key
   */
  shouldAlert(errorKey: string): boolean {
    const now = Date.now();
    const entry = this.cache.get(errorKey);

    // No entry exists - first occurrence, send alert
    if (!entry) {
      return true;
    }

    // If we're outside the window, this counts as a new occurrence
    if (now - entry.lastSeen > this.WINDOW_MS) {
      return true;
    }

    // Within window - don't send
    return false;
  }

  /**
   * Record an error occurrence
   */
  record(errorKey: string): void {
    const now = Date.now();
    const existing = this.cache.get(errorKey);

    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
    } else {
      this.cache.set(errorKey, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
      });
    }
  }

  /**
   * Get current deduplication status for an error key (for debugging)
   */
  getStatus(
    errorKey: string,
  ): { count: number; ageMs: number; blocked: boolean } | null {
    const entry = this.cache.get(errorKey);
    if (!entry) return null;

    const ageMs = Date.now() - entry.lastSeen;
    return {
      count: entry.count,
      ageMs,
      blocked: ageMs < this.WINDOW_MS,
    };
  }

  /**
   * Clean up stale entries to prevent memory leaks
   * Should be called periodically (e.g., every 5 minutes)
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastSeen > this.CLEANUP_MS) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get total number of tracked errors (for monitoring)
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance
const errorDeduplicator = new ErrorDeduplicator();

// Start cleanup interval (runs every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const removed = errorDeduplicator.cleanup();
      if (removed > 0) {
        console.log(`[ErrorDeduplication] Cleaned up ${removed} stale entries`);
      }
    },
    5 * 60 * 1000,
  );
}

export { errorDeduplicator };

// Shared call-display rules for the communication hub. The client list and the
// phone tab both have to decide "is this call still happening?" the same way,
// otherwise the sidebar and the conversation disagree about the same call.

/** Twilio statuses that mean the call never connected. */
export const MISSED_STATUSES = new Set([
  "no-answer",
  "busy",
  "failed",
  "canceled",
]);

/** Statuses where the call is still ringing or connected. */
export const LIVE_STATUSES = new Set(["ringing", "in-progress"]);

/**
 * A call can only genuinely ring or stay connected for so long. Past this, an
 * unsettled row means the final Twilio callback never arrived, so we treat it
 * as missed instead of as a call that rings forever.
 */
export const STALE_CALL_AFTER_MS = 10 * 60 * 1000;

/**
 * True while a call is actually in progress — i.e. its status says live *and*
 * that status is recent enough to believe.
 */
export function isCallLive(
  status: string | null | undefined,
  updatedAt: Date | string | null | undefined,
): boolean {
  if (!status || !LIVE_STATUSES.has(status)) return false;
  if (!updatedAt) return false;
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= STALE_CALL_AFTER_MS;
}

/**
 * True when a stored status still claims the call is live but has gone stale —
 * the row should render as missed.
 */
export function isCallStale(
  status: string | null | undefined,
  timestamp: Date | string | null | undefined,
): boolean {
  if (!status || !LIVE_STATUSES.has(status)) return false;
  if (!timestamp) return true;
  const ts = new Date(timestamp).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > STALE_CALL_AFTER_MS;
}

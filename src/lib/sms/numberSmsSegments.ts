import { segmentMessage } from "./segmentMessage";

/**
 * Splits a message and prefixes each part with "(i/total) " so the recipient
 * can reconstruct the reading order even when the carrier delivers the
 * separate texts out of sequence (carriers do NOT guarantee delivery order
 * for independently-submitted SMS — this label is the fix for that).
 *
 * The prefix width is reserved from `maxLength` before splitting, so every
 * numbered segment still fits within `maxLength`. `total` is fully dynamic:
 * it grows/shrinks with the message length, never hardcoded. A one-segment
 * message is returned unlabeled (no pointless "(1/1)").
 */
const DEFAULT_MAX_SEGMENT_LENGTH = 150;
/** Fixed-point iterations: reserving prefix space can push the count across a
 * digit boundary (9 -> 10 widens the prefix), which may add a segment. A few
 * passes are enough to converge. */
const MAX_STABILIZE_PASSES = 6;

export function numberSmsSegments(
  message: string | null | undefined,
  maxLength: number = DEFAULT_MAX_SEGMENT_LENGTH,
): string[] {
  if (segmentMessage(message, maxLength).length <= 1) {
    return segmentMessage(message, maxLength);
  }

  let total = segmentMessage(message, maxLength).length;
  let segments = segmentMessage(message, maxLength - prefixWidth(total));

  for (let pass = 0; pass < MAX_STABILIZE_PASSES; pass++) {
    if (segments.length === total) break;
    total = segments.length;
    segments = segmentMessage(message, maxLength - prefixWidth(total));
  }

  const finalTotal = segments.length;
  return segments.map((text, i) => `(${i + 1}/${finalTotal}) ${text}`);
}

/** Character cost of the widest prefix for a given total, e.g. "(12/12) ". */
function prefixWidth(total: number): number {
  return `(${total}/${total}) `.length;
}

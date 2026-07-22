/**
 * Splits a long outbound message into multiple SMS-sized segments.
 *
 * We send each segment as its own Twilio/Infobip message (not Twilio's
 * built-in multi-part concatenation), so the goal isn't the carrier's
 * 153/160-char GSM-7 rule — it's staying comfortably under the length that
 * makes carriers flag a single text as spam. Splitting is sentence-aware:
 * we cut at the nearest ". " / "! " / "? " at or before maxLength so a
 * sentence never gets torn in half across two texts. If no sentence
 * boundary exists in range (e.g. one long run-on sentence), we fall back
 * to the nearest word boundary, and only hard-cut mid-word as a last resort.
 */

const DEFAULT_MAX_SEGMENT_LENGTH = 150;
/** Below this fraction of maxLength, a sentence-boundary cut is too short to
 * be useful (would produce a tiny leading fragment) — prefer a word-boundary
 * cut closer to maxLength instead. */
const MIN_USEFUL_CUT_RATIO = 0.3;

export function segmentMessage(
  message: string | null | undefined,
  maxLength: number = DEFAULT_MAX_SEGMENT_LENGTH,
): string[] {
  const text = (message ?? "").trim();
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const segments: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    const window = remaining.slice(0, maxLength);
    let cut = findLastSentenceBoundary(remaining, window);

    if (cut === -1 || cut < maxLength * MIN_USEFUL_CUT_RATIO) {
      const lastSpace = window.lastIndexOf(" ");
      cut = lastSpace > 0 ? lastSpace : maxLength;
    }

    segments.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) segments.push(remaining);
  return segments;
}

/**
 * Finds the last ". " / "! " / "? " boundary inside `window`, using
 * `remaining` to check what follows the punctuation (end-of-string counts
 * as a boundary too). Returns the index to cut at (i.e. right after the
 * punctuation), or -1 if none found.
 */
function findLastSentenceBoundary(remaining: string, window: string): number {
  for (let i = window.length - 1; i >= 0; i--) {
    const ch = window[i];
    if (ch === "." || ch === "!" || ch === "?") {
      const next = remaining[i + 1];
      if (next === undefined || next === " " || next === "\n") {
        return i + 1;
      }
    }
  }
  return -1;
}

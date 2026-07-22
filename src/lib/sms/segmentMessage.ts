const DEFAULT_MAX_SEGMENT_LENGTH = 150;
/** Below this fraction of maxLength, a sentence-boundary cut is too short to
 * be useful (would produce a tiny leading fragment) — prefer a word-boundary
 * cut closer to maxLength instead. */
const MIN_USEFUL_CUT_RATIO = 0.3;

export function segmentMessage(
  message: string | null | undefined,
  maxLength: number = DEFAULT_MAX_SEGMENT_LENGTH,
): string[] {
  const text = normalizeSentenceSpacing(
    normalizeGluedClauses((message ?? "").trim()),
  );
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

function normalizeGluedClauses(text: string): string {
  return text.replace(
    /([a-z]{2,}(?:ing|tion|sion|ment|ness|ance|ence|ous|ful|less|ly|ed))(?=[A-Z])/g,
    "$1. ",
  );
}

/**
 * Inserts a space whenever "." / "!" / "?" / ":" is immediately followed by
 * a capital letter with no space between them — the pattern the AI agent's
 * output produces when it merges two sentences (or a list intro) together.
 * Restricted to capital letters so numbers/decimals ("$89.99") and
 * lowercase run-ons ("e.g.this") are left untouched.
 */
function normalizeSentenceSpacing(text: string): string {
  return text.replace(/([.!?:])(?=[A-Z])/g, "$1 ");
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

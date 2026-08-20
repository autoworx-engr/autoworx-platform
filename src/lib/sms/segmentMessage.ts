/**
 * Splits a long outbound message into ordered, SMS-sized segments.
 *
 * Each segment is sent as its own Twilio/Infobip message (not Twilio's
 * built-in multi-part concatenation), so the goal isn't the carrier's
 * 153/160-char GSM-7 rule — it's staying under the length that makes carriers
 * flag a single long text as spam.
 *
 * Algorithm (tokenize-then-pack, NOT greedy "slice first 150"):
 *   1. Normalize the raw AI output, which frequently glues sentences/clauses
 *      together with no separator ("you wantEngine Bay...", "years)Headlight").
 *   2. Tokenize into logical units (sentences + hard newlines), keeping every
 *      character and its original order.
 *   3. Pack whole units into segments, starting a new segment only when the
 *      next unit would exceed maxLength.
 *   4. Any single unit longer than maxLength is split by a boundary-priority
 *      ladder: sentence-ending → newline → colon → semicolon → comma → space
 *      → hard cut (last resort).
 *
 * Guarantees: segments come out in original reading order, no unit is
 * reordered, and every segment is <= maxLength. Whitespace at the boundaries
 * we split on is trimmed (segments never lead/trail with spaces); no other
 * characters are dropped or duplicated.
 */

export type SmsSegment = string;

const DEFAULT_MAX_SEGMENT_LENGTH = 150;

export function segmentMessage(
  message: string | null | undefined,
  maxLength: number = DEFAULT_MAX_SEGMENT_LENGTH,
): SmsSegment[] {
  const text = normalizeSentenceSpacing(
    normalizeGluedNumbers(normalizeGluedClauses((message ?? "").trim())),
  );
  if (!text) return [];
  if (text.length <= maxLength) return [text];
  return packUnits(splitIntoUnits(text), maxLength);
}

/**
 * Breaks text into logical units — one per sentence, plus a break at every
 * hard newline. Each unit keeps its trailing whitespace, so joining all units
 * back together reproduces the input exactly (order preserved, nothing lost).
 */
function splitIntoUnits(text: string): string[] {
  const units: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!isSentenceEnd(text, i) && text[i] !== "\n") continue;
    // Absorb the whitespace that follows the boundary into this unit.
    let end = i + 1;
    while (end < text.length && isWhitespace(text[end])) end++;
    units.push(text.slice(start, end));
    start = end;
    i = end - 1;
  }
  if (start < text.length) units.push(text.slice(start));
  return units;
}

/**
 * Fills segments with whole units in order. A unit is appended to the current
 * segment while it still fits; otherwise the current segment is flushed and
 * the unit starts a new one. Units that are themselves too long are split via
 * the boundary-priority ladder before being emitted.
 */
function packUnits(units: string[], maxLength: number): SmsSegment[] {
  const segments: SmsSegment[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) segments.push(trimmed);
    current = "";
  };

  for (const unit of units) {
    if (unit.trim().length === 0) continue; // whitespace-only separator
    if (unit.trim().length > maxLength) {
      flush();
      segments.push(...splitLongUnit(unit, maxLength));
      continue;
    }
    if ((current + unit).trim().length <= maxLength) {
      current += unit;
    } else {
      flush();
      current = unit;
    }
  }
  flush();
  return segments;
}

/**
 * Splits a single over-long unit into <= maxLength pieces using the boundary
 * ladder. Each pass takes the best available boundary at or before maxLength,
 * falling back to a hard cut only when no boundary exists in range.
 */
function splitLongUnit(unit: string, maxLength: number): SmsSegment[] {
  const pieces: SmsSegment[] = [];
  let rest = unit;
  while (rest.trim().length > maxLength) {
    const cut = findSplitIndex(rest, maxLength);
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut);
  }
  const tail = rest.trim();
  if (tail) pieces.push(tail);
  return pieces;
}

interface SplitRule {
  /** True when index `i` in `text` is a boundary of this class. */
  isBoundary: (text: string, i: number) => boolean;
  /** Whether the boundary character stays with the left (preceding) segment. */
  keepDelimiter: boolean;
}

/** Ordered highest-priority boundary first; the ladder the spec requires. */
const SPLIT_RULES: readonly SplitRule[] = [
  { isBoundary: isSentenceEnd, keepDelimiter: true },
  { isBoundary: (t, i) => t[i] === "\n", keepDelimiter: false },
  { isBoundary: isPunctuationBoundary(":"), keepDelimiter: true },
  { isBoundary: isPunctuationBoundary(";"), keepDelimiter: true },
  { isBoundary: isPunctuationBoundary(","), keepDelimiter: true },
  { isBoundary: (t, i) => isWhitespace(t[i]), keepDelimiter: false },
];

/**
 * Returns the index at which to cut `text` so the left part is <= maxLength,
 * choosing the highest-priority boundary available. Returns `maxLength`
 * (hard cut) when no boundary is found in range.
 */
function findSplitIndex(text: string, maxLength: number): number {
  for (const rule of SPLIT_RULES) {
    const from = Math.min(
      maxLength - (rule.keepDelimiter ? 1 : 0),
      text.length - 1,
    );
    for (let i = from; i >= 1; i--) {
      if (!rule.isBoundary(text, i)) continue;
      const cut = rule.keepDelimiter ? i + 1 : i;
      if (cut >= 1 && cut <= maxLength) return cut;
    }
  }
  return maxLength;
}

/** `.` `!` `?` count as a sentence end only when followed by whitespace/end. */
function isSentenceEnd(text: string, i: number): boolean {
  const ch = text[i];
  if (ch !== "." && ch !== "!" && ch !== "?") return false;
  const next = text[i + 1];
  return next === undefined || isWhitespace(next);
}

/**
 * Builds a boundary test for `,` `;` `:` that only fires when the mark is
 * followed by whitespace/end — so number groupings ("$1,200") and ratios
 * ("3:1") are never split.
 */
function isPunctuationBoundary(mark: string) {
  return (text: string, i: number): boolean => {
    if (text[i] !== mark) return false;
    const next = text[i + 1];
    return next === undefined || isWhitespace(next);
  };
}

function isWhitespace(ch: string | undefined): boolean {
  return ch !== undefined && /\s/.test(ch);
}

/**
 * Compound words/brand names that legitimately mix case with no separator
 * (e.g. "AutoWorx", "iPhone") — exempted so they aren't split apart.
 */
const KNOWN_COMPOUND_WORDS = new Set([
  "autoworx",
  "iphone",
  "ipad",
  "ios",
  "youtube",
  "ebay",
  "paypal",
  "whatsapp",
  "tiktok",
  "linkedin",
  "facebook",
  "instagram",
  "gofundme",
  "macbook",
  "airpods",
  "github",
  "javascript",
  "typescript",
]);

/**
 * Inserts ". " inside a letter-run that was glued together with no separator
 * (e.g. "reductionCeramic", "wantEngine" — two clauses concatenated). Any run
 * containing a lowercase-to-uppercase transition is treated as glued, unless
 * the whole run is a known compound word.
 */
function normalizeGluedClauses(text: string): string {
  return text.replace(/[A-Za-z]+/g, (run) => {
    if (KNOWN_COMPOUND_WORDS.has(run.toLowerCase())) return run;
    if (!/[a-z][A-Z]/.test(run)) return run;
    return run.replace(/([a-z])(?=[A-Z])/g, "$1. ");
  });
}

/**
 * Inserts a space when "." "!" "?" ":" ")" "]" is immediately followed by a
 * capital letter — the pattern produced when the AI merges a sentence, list
 * intro, or parenthetical into the next clause. Capital-only so decimals
 * ("$89.99") and lowercase run-ons ("e.g.this") are left untouched.
 */
/**
 * Inserts ". " where a digit is glued to a capitalised word ("$4000Window
 * Tinting") — the shape AI price lists take when the separator is dropped. A
 * following lowercase is required, so "24V Battery"/"4K Video"/"5W30" survive.
 */
function normalizeGluedNumbers(text: string): string {
  return text.replace(/(\d)(?=[A-Z][a-z])/g, "$1. ");
}

function normalizeSentenceSpacing(text: string): string {
  return text.replace(/([.!?:)\]])(?=[A-Z])/g, "$1 ");
}

import type { KeyboardEvent } from "react";

/**
 * Native <input type="number"> accepts "e"/"E" (scientific notation), "+",
 * and "." as valid keystrokes regardless of `step`/`min` — those attributes
 * only constrain the final value, not what can be typed. Use as onKeyDown
 * on integer-only fields to block them at the keystroke level instead of
 * only catching them on submit.
 */
export function blockNonIntegerKeys(
  e: KeyboardEvent<HTMLInputElement>,
  options?: { allowNegative?: boolean },
) {
  if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === ".") {
    e.preventDefault();
    return;
  }
  if (e.key === "-" && !options?.allowNegative) {
    e.preventDefault();
  }
}

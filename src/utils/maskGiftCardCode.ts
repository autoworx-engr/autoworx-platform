/**
 * Masks a gift card code for display, always revealing the true last 2
 * characters (not just the last dash-separated segment, which assumes a
 * fixed code shape and silently breaks if that ever changes).
 */
export function maskGiftCardCode(code: string): string {
  const prefix = code.split("-")[0] || code.slice(0, 3);
  const lastTwo = code.slice(-2);
  return `${prefix}-****-${lastTwo}`;
}

/**
 * Validated dataviz palette (fixed hue order — CVD-safe adjacent pairs).
 * Categorical = identity (status/user breakdowns). Status = reserved
 * severity states (good/warning/serious/critical), never reused as series 4+.
 */
export const CATEGORICAL = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export const STATUS_COLOR = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  neutral: "#9ca3af",
};

export const PRIORITY_COLOR: Record<string, string> = {
  urgent: STATUS_COLOR.critical,
  high: STATUS_COLOR.serious,
  normal: STATUS_COLOR.warning,
  low: STATUS_COLOR.good,
  none: STATUS_COLOR.neutral,
};

export function categoricalColor(index: number): string {
  return CATEGORICAL[index % CATEGORICAL.length];
}

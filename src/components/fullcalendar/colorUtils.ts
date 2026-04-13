export const isHexColor = (value?: string): value is string =>
  !!value && /^#([0-9A-Fa-f]{3}){1,2}$/.test(value);

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const int = Number.parseInt(expanded, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

/** Mix color with white to produce a solid light background. ratio=0 → white, ratio=1 → full color */
export const lightenHex = (hex: string, ratio: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c * ratio + 255 * (1 - ratio));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

/** Darken by mixing with black. ratio=0 → black, ratio=1 → full color */
export const darkenHex = (hex: string, ratio: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c * ratio);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

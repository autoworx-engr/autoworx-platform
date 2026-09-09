import { PlatformFeatureType } from "@prisma/client";

export function normalizeFeatureKey(featureKey: string): string {
  // Convert snake_case or kebab-case keys to camelCase for easier usage in TS.
  return featureKey
    .toLowerCase()
    .replace(/[-_]+([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

export function parseFeatureValue(
  type: PlatformFeatureType,
  raw: string,
): boolean | number | string {
  switch (type) {
    case PlatformFeatureType.BOOLEAN:
      return raw === "true" || raw === "1";
    case PlatformFeatureType.NUMERIC: {
      const num = Number(raw);
      return Number.isNaN(num) ? 0 : num;
    }
    case PlatformFeatureType.TEXT:
    default:
      return raw;
  }
}

/**
 * Ensures a US (or country-unspecified) phone number is stored with its
 * country code prefix (+1), matching how the web UI's phone widget stores
 * numbers. Numbers that already start with "+" are left untouched; non-US
 * numbers without a "+" are stored as-given rather than mangled.
 *
 * Composes cleanly with normalizePhoneForStorage: this function produces a
 * "+"-prefixed string, which normalizePhoneForStorage preserves unchanged.
 */
export function ensureCountryCode(
  mobile: string | undefined,
  countryCode: string | undefined,
): string | undefined {
  if (!mobile) return mobile;
  const trimmed = mobile.trim();
  if (trimmed.length === 0) return trimmed;
  if (trimmed.startsWith("+")) return trimmed;
  const isUS = !countryCode || countryCode.toUpperCase() === "US";
  if (!isUS) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  const local =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return `+1${local}`;
}

import countriesData from "@/utils/allcountries.json";

// Only three calling codes in allcountries.json map to genuinely different
// countries; the rest of the collisions are duplicate rows. Pick the primary
// so a stored number always resolves to the same flag.
const PRIMARY_ISO_BY_CALLING_CODE: Record<string, string> = {
  "+1": "US",
  "+39": "IT",
  "+44": "GB",
};

/**
 * Resolve a country ISO code from a stored international phone number
 * (e.g. "+15551234567" -> "US"), so PhoneInput can be seeded with
 * defaultIsoCode where only the combined number is persisted.
 *
 * Matches the longest calling code, so overlapping codes like "+1" and
 * "+1473" resolve to the more specific country. Returns undefined for
 * numbers stored without a "+" prefix, letting PhoneInput fall back.
 */
export function getIsoCodeFromPhone(
  phone: string | null | undefined,
): string | undefined {
  if (!phone) return undefined;

  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) return undefined;

  const countries = Array.isArray(countriesData)
    ? (countriesData as any[])
    : [];

  let bestCode = "";
  let bestIso: string | undefined;

  for (const country of countries) {
    const code = (country.callingCode || "").toString().replace(/[^\d+]/g, "");
    const iso = (country.countryCode || "").toString().toUpperCase();
    if (!code || !iso || !cleaned.startsWith(code)) continue;
    if (code.length <= bestCode.length) continue;

    bestCode = code;
    bestIso = iso;
  }

  if (!bestIso) return undefined;
  return PRIMARY_ISO_BY_CALLING_CODE[bestCode] ?? bestIso;
}

/**
 * Normalize a phone number to a consistent format for storage.
 * If the number already has an international "+" prefix, preserve it (remove only spaces/dashes).
 * For bare US numbers (11 digits starting with "1"), strips the leading "1" to store as 10 digits.
 * This ensures consistent matching regardless of how the number was originally entered
 * (e.g., "(678) 478-7306", "6784787306" normalize to "6784787306";
 *  "+16784787306" is preserved as "+16784787306").
 */
export function normalizePhoneForStorage(
  phone: string | null | undefined,
): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  // Preserve international format — keep the "+" and remove only spaces/formatting chars
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[^\d+]/g, "");
  }
  const digits = trimmed.replace(/\D/g, "");
  // US numbers: strip leading country code "1" from 11-digit numbers
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits || phone;
}

/**
 * Build lookup values for finding a client by phone number in the database.
 * Returns an array of digit-only variants to match against stored phone numbers
 * using `endsWith`, covering cases where stored numbers may have different formats.
 */
export function phoneNumberLookupValues(
  phone: string | null | undefined,
): string[] {
  if (!phone) return [];
  const digits = phone.replace(/\D/g, "");
  if (!digits) return [];

  if (digits.length > 11) {
    return [digits];
  }

  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

  return Array.from(new Set([last10, digits].filter((v) => v.length > 0)));
}

/**
 * Build a Prisma OR condition to match a client's mobile field against a phone number.
 * Handles all common formats: +1XXXXXXXXXX, 1XXXXXXXXXX, XXXXXXXXXX, (XXX) XXX-XXXX, etc.
 */
export function phoneLookupWhereClause(phone: string | null | undefined) {
  const values = phoneNumberLookupValues(phone);
  if (values.length === 0) return undefined;

  return values.map((lookupValue) => ({
    mobile: { endsWith: lookupValue },
  }));
}

export function normalizeUSPhoneNumber(phone: string) {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Normalize to +1XXXXXXXXXX format
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  } else {
    return phone;
  }
}

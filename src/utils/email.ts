const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Emails are stored lowercase, so uppercase input is folded down (and padding
 * trimmed) both while typing and before submitting.
 */
export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isValidEmail = (value: string) =>
  EMAIL_REGEX.test(normalizeEmail(value));

/**
 * Lowercases an uncontrolled email input in place (forms that read their value
 * off the DOM) and returns the normalized value.
 */
export function lowercaseEmailInput(input: HTMLInputElement) {
  const value = normalizeEmail(input.value);
  if (input.value !== value) input.value = value;
  return value;
}

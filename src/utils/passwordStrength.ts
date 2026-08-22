/**
 * 0-5 score used by the auth forms' strength meters. Length is the first
 * point because it matters most; the character-class points are guidance,
 * not a requirement — the schema enforces length only.
 */
export function getPasswordStrengthScore(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z\d]/.test(password)) score++;
  return score;
}

export function getPasswordStrengthMeta(score: number) {
  if (score <= 2) return { label: "Weak", barClass: "bg-red-500" };
  if (score <= 4) return { label: "Fair", barClass: "bg-yellow-500" };
  return { label: "Strong", barClass: "bg-green-500" };
}

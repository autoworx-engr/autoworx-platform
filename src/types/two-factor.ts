export type TwoFactorConfig = {
  codeLength: number;
  expiryMinutes: number;
  maxRetries: number;
  lockoutDurationMinutes: number;
};

export const TWO_FACTOR_CONFIG: TwoFactorConfig = {
  codeLength: 6, // Change from 6 to 8
  // ...
  expiryMinutes: 10,
  maxRetries: 3,
  lockoutDurationMinutes: 15,
};

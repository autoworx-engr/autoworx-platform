-- Mark a password-reset OTP as consumed once it has been verified.
-- Prevents reuse of an already-verified OTP after a page reload / session reload.
-- Existing rows default to false (treated as not-yet-verified).
ALTER TABLE "PasswordResetToken"
ADD COLUMN IF NOT EXISTS "otp_verified" BOOLEAN NOT NULL DEFAULT false;

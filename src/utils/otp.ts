// lib/otp.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { TWO_FACTOR_CONFIG } from "@/types/two-factor";

/**
 * Generates a random numeric OTP code
 * @param length - Length of the code (default: 6)
 * @returns A numeric string of specified length
 */
export function generateOTP(
  length: number = TWO_FACTOR_CONFIG.codeLength,
): string {
  const digits = "0123456789";
  let otp = "";

  // Use crypto.randomInt for secure random generation
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }

  return otp;
}

/**
 * Hashes the OTP code using bcrypt
 * @param code - Plain text OTP code
 * @returns Hashed code
 */
export async function hashOTP(code: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(code, saltRounds);
}

/**
 * Verifies an OTP code against its hash
 * @param code - Plain text code to verify
 * @param hash - Stored hash to compare against
 * @returns True if code matches
 */
export async function verifyOTP(code: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(code, hash);
}

/**
 * Generates a unique session ID for 2FA flow
 * @returns Random session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Calculates expiry time for 2FA token
 * @param minutes - Minutes until expiry
 * @returns Date object
 */
export function getExpiryTime(
  minutes: number = TWO_FACTOR_CONFIG.expiryMinutes,
): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

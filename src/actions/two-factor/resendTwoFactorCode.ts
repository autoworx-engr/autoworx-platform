"use server";

import send2faOtpMail from "@/actions/two-factor/send2faOtpMail";
import { db } from "@/lib/db";
import {
  generateOTP,
  generateSessionId,
  getExpiryTime,
  hashOTP,
} from "@/utils/otp";

export const resendTwoFactorCode = async (email: string) => {
  // 1. Validation
  if (!email) {
    return { type: "fail", message: "Email is required!" };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    return { type: "fail", message: "Email not found!" };
  }

  // 2. Rate Limiting (Prevent Spam)
  const existingToken = await db.twoFactorToken.findUnique({
    where: { userId: existingUser.id },
  });

  if (existingToken) {
    const now = new Date().getTime();
    const created = new Date(existingToken.createdAt).getTime();
    const timeDiff = now - created;

    // Rule: Must wait 60 seconds before resending
    if (timeDiff < 60 * 1000) {
      const secondsLeft = Math.ceil((60000 - timeDiff) / 1000);
      return {
        type: "fail",
        message: `Please wait ${secondsLeft} seconds before resending.`,
      };
    }
  }

  const otpCode = generateOTP();
  const sessionId = generateSessionId();
  const tokenHash = await hashOTP(otpCode);
  const expiresAt = getExpiryTime();

  // 4. Update Database (Rotate the Token)
  await db.twoFactorToken.upsert({
    where: { userId: existingUser.id },
    update: {
      tokenHash,
      expiresAt,
      attemptCount: 0,
      sessionId,
    },
    create: {
      userId: existingUser.id,
      tokenHash,
      expiresAt,
      attemptCount: 0,
      sessionId,
    },
  });

  // 5. Send Email
  await send2faOtpMail({
    email,
    userId: existingUser.id,
  });

  return { type: "success", message: "Code resent! Check your email." };
};

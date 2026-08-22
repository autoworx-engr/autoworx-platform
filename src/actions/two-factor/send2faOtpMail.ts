"use server";

import { db } from "@/lib/db";
import {
  generateOTP,
  generateSessionId,
  getExpiryTime,
  hashOTP,
} from "@/utils/otp";
import { sendOTPEmail } from "./send2faMail";
import { cookies } from "next/headers";
import { TWO_FACTOR_CONFIG } from "@/types/two-factor";

type TSend2faOtp = {
  userId: number;
  email: string;
};

export default async function send2faOtpMail({ userId, email }: TSend2faOtp) {
  try {
    // Validate input
    if (!userId || !email) {
      return {
        type: "fail",
        message: "Missing required fields",
      };
    }

    // Verify user exists and has 2FA enabled
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true, // Assumes you have this field in User model
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return {
        type: "fail",
        message: "User not found",
      };
    }

    if (!user.twoFactorEnabled) {
      return {
        type: "fail",
        message: "2FA is not enabled for this user",
      };
    }

    // Generate OTP and session ID
    const otpCode = generateOTP();
    const sessionId = generateSessionId();
    const tokenHash = await hashOTP(otpCode);
    const expiresAt = getExpiryTime();

    // Delete any existing 2FA token for this user (due to @unique constraint)
    await db.twoFactorToken.deleteMany({
      where: { userId: user.id },
    });

    // 3. Save to Database
    await db.twoFactorToken.upsert({
      where: { userId: user.id },
      update: {
        tokenHash,
        sessionId, // <--- Saving it here
        attemptCount: 0, // Reset attempts on new code
        expiresAt,
      },
      create: {
        userId: user.id,
        tokenHash,
        sessionId,
        expiresAt,
      },
    });

    // 4. Set the Session ID in a HTTP-Only Cookie
    // Attackers can't read this via JS
    (await cookies()).set("2fa_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: TWO_FACTOR_CONFIG.expiryMinutes * 60,
    });

    // Send OTP via email
    const emailSent = await sendOTPEmail({
      to: user.email,
      code: otpCode,
      userName: user.firstName + " " + user.lastName,
    });

    if (!emailSent) {
      // Clean up the token if email fails
      await db.twoFactorToken.deleteMany({
        where: { userId: user.id },
      });

      return {
        type: "fail",
        message: "Failed to send verification code",
      };
    }

    return {
      type: "success",
      message: "Verification code sent to your email",
      sessionId,
      requiresTwoFactor: true,
    };
  } catch (error) {
    console.error("2FA generation error:", error);
    return {
      type: "fail",
      message: "Internal server error",
    };
  }
}

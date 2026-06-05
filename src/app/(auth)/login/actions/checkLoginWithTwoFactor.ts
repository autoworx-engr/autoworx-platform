"use server";

import send2faOtpMail from "@/actions/two-factor/send2faOtpMail";
import { db } from "@/lib/db";
import { createRateLimiter } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const loginEmailLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 10,
});

const otpEmailLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 10,
});

type TValues = {
  email: string;
  password: string;
  code?: string;
};

export async function checkLoginWithTwoFactor(values: TValues): Promise<{
  type: string;
  message: string;
  twoFactor?: boolean;
  nextLogin?: boolean;
}> {
  const { email: rawEmail, password, code } = values;
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    return { type: "fail", message: "Email is required" };
  }

  if (code) {
    const otpCheck = otpEmailLimiter.check(email);
    if (!otpCheck.allowed) {
      return {
        type: "fail",
        message: "Too many OTP attempts. Please try again later.",
      };
    }
  } else {
    const loginCheck = loginEmailLimiter.check(email);
    if (!loginCheck.allowed) {
      return {
        type: "fail",
        message: "Too many login attempts. Please try again later.",
      };
    }
  }

  const existingUser = await db.user.findUnique({ where: { email } });

  if (!existingUser || !existingUser.password) {
    return { type: "fail", message: "Invalid credentials!" };
  }

  // 1. Password Check
  const passwordsMatch = await bcrypt.compare(password, existingUser.password);
  if (!passwordsMatch) {
    // TODO: Increment loginAttempts here
    return { type: "fail", message: "Invalid credentials!" };
  }

  // 2. 2FA Logic
  if (existingUser?.twoFactorEnabled && existingUser?.emailVerified) {
    // CASE A: User sent the code (Phase 2)
    if (code) {
      const twoFactorToken = await db.twoFactorToken.findUnique({
        where: { userId: existingUser.id },
      });

      if (!twoFactorToken) {
        return { type: "fail", message: "Invalid code!" };
      }

      const sessionCookie = (await cookies()).get("2fa_session")?.value;

      if (
        twoFactorToken.sessionId &&
        twoFactorToken.sessionId !== sessionCookie
      ) {
        return {
          type: "fail",
          message: "Invalid session. Please login again.",
        };
      }

      if (twoFactorToken.attemptCount >= 3) {
        await db.twoFactorToken.delete({
          where: { id: twoFactorToken.id },
        });
        return {
          type: "fail",
          message: "Too many failed attempts. Please request a new code.",
        };
      }

      const hasExpired = new Date(twoFactorToken?.expiresAt) < new Date();
      if (hasExpired) {
        await db.twoFactorToken.delete({
          where: { id: twoFactorToken.id },
        });
        return { type: "fail", message: "Code expired!" };
      }

      const isValidCode = await bcrypt.compare(
        code,
        twoFactorToken?.tokenHash || "",
      );

      if (!isValidCode) {
        await db.twoFactorToken.update({
          where: { id: twoFactorToken.id },
          data: {
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });
        return { type: "fail", message: "Invalid code!" };
      }

      // Valid Code! Create Confirmation to allow NextAuth login
      await db.twoFactorToken.delete({ where: { id: twoFactorToken.id } });

      // 2. Clear the temp cookie
      (await cookies()).delete("2fa_session");

      const existingConfirmation = await db.twoFactorConfirmation.findUnique({
        where: { userId: existingUser.id },
      });

      if (existingConfirmation) {
        await db.twoFactorConfirmation.delete({
          where: { id: existingConfirmation.id },
        });
      }

      await db.twoFactorConfirmation.create({
        data: { userId: existingUser.id },
      });

      return { type: "success", message: "Login successful", nextLogin: true };
    }
    // CASE B: First login attempt (Phase 1)
    else {
      const { type } = await send2faOtpMail({ userId: existingUser.id, email });

      if (type === "success")
        return {
          type: "success",
          message: "Verification code sent to your email",
          twoFactor: true,
          nextLogin: false,
        };
      else
        return {
          type: "fail",
          message: "Failed to send verification code",
        };
    }
  }
  return { type: "success", message: "Login successful", nextLogin: true };
}

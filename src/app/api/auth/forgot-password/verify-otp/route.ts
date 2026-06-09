import { db } from "@/lib/db";
import { createRateLimiter, extractClientIp } from "@/lib/rateLimit";
import { verifyOTP } from "@/utils/otp";
import { NextRequest, NextResponse } from "next/server";

// 10 verification attempts per IP per 15 minutes
const ipLimiter = createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 10 });
// 5 verification attempts per email per 15 minutes
const emailLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 5,
});

/**
 * @swagger
 * /api/auth/forgot-password/verify-otp:
 *   post:
 *     summary: Verify OTP for password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
export async function POST(req: NextRequest) {
  const ip = extractClientIp(
    req.headers.get("x-forwarded-for"),
    req.headers.get("x-real-ip"),
  );

  const ipCheck = ipLimiter.check(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(ipCheck.retryAfterMs / 1000)),
        },
      },
    );
  }

  const body = await req.json();
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";

  if (!email || !otp) {
    return NextResponse.json(
      { error: "Email and OTP are required" },
      { status: 400 },
    );
  }

  const emailCheck = emailLimiter.check(email);
  if (!emailCheck.allowed) {
    return NextResponse.json(
      { error: "Too many attempts for this email. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(emailCheck.retryAfterMs / 1000)),
        },
      },
    );
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Fetch the token by email (OTP is now stored as a bcrypt hash, so we
  // cannot query by otp value directly — we compare with verifyOTP() instead).
  // An already-verified OTP is excluded so it cannot be reused after a page
  // reload / session reload.
  const token = await db.passwordResetToken.findFirst({
    where: {
      user: { email },
      expiresAt: { gt: new Date() },
      otpVerified: false,
    },
  });

  if (!token) {
    return NextResponse.json(
      { error: "Invalid or expired OTP" },
      { status: 400 },
    );
  }

  // Use constant-time bcrypt comparison to prevent timing attacks.
  const isValid = await verifyOTP(otp, token.otp);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid or expired OTP" },
      { status: 400 },
    );
  }

  // Mark the OTP as consumed. The guard on otpVerified makes this a one-time
  // operation even under concurrent submissions — a second request matches 0
  // rows and the OTP is already gone from the eligible set above on reload.
  const consumed = await db.passwordResetToken.updateMany({
    where: { id: token.id, otpVerified: false },
    data: { otpVerified: true },
  });

  if (consumed.count === 0) {
    return NextResponse.json(
      { error: "Invalid or expired OTP" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, token: token.token });
}

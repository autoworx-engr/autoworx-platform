import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { NextResponse, NextRequest } from "next/server";
import { createRateLimiter, extractClientIp } from "@/lib/rateLimit";

// 20 attempts per IP per 15 minutes to prevent DB flooding
const ipLimiter = createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 20 });

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
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
  // ──────────────────────────────────────────────────────────────────────────

  const body = await req.json();
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const newPassword =
    typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!token || !newPassword) {
    return NextResponse.json(
      { error: "Token and new password are required" },
      { status: 400 },
    );
  }

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 },
    );
  }

  const salt_rounded = Number(process.env.SALT_ROUNDS ?? 12);

  const hashedPassword = await hash(newPassword, salt_rounded);

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    db.passwordResetToken.delete({ where: { id: resetToken.id } }),
  ]);

  return NextResponse.json(
    {
      success: true,
      message: "Password reset successful",
      email: resetToken.user.email,
    },
    { status: 200 },
  );
}

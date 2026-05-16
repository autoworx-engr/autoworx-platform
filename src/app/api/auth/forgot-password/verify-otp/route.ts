import { db } from "@/lib/db";
import { NextResponse } from "next/server";

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
 */
export async function POST(req: Request) {
  const { email, otp } = await req.json();

  const token = await db.passwordResetToken.findFirst({
    where: {
      user: { email },
      otp,
      expiresAt: { gt: new Date() },
    },
  });

  if (!token)
    return NextResponse.json(
      { error: "Invalid or expired OTP" },
      { status: 400 },
    );

  return NextResponse.json({ success: true, token: token.token });
}

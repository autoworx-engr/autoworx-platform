import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

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
export async function POST(req: Request) {
  const { token, newPassword } = await req.json();

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

  const hashedPassword = await hash(newPassword, 10);

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

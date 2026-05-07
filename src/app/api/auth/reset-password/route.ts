import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

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

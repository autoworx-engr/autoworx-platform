import { db } from "@/lib/db";
import { hash } from "bcrypt";
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

  const hashedPassword = await hash(newPassword, 10);

  await db.user.update({
    where: { id: resetToken.userId },
    data: { password: hashedPassword },
  });

  const user = await db.user.findUnique({
    where: { id: resetToken.userId },
  });

  await db.passwordResetToken.delete({ where: { id: resetToken.id } });

  return NextResponse.json(
    {
      success: true,
      message: "Password reset successful",
      email: user?.email,
    },
    { status: 200 },
  );
}

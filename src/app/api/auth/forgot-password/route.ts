import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailgun";
import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email)
    return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Delete any existing OTPs for the user
  await db.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Generate new token and OTP
  const token = randomUUID();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = addMinutes(new Date(), 15); // OTP valid for 15 minutes

  // Create a new password reset token
  await db.passwordResetToken.create({
    data: {
      token,
      otp,
      userId: user.id,
      expiresAt,
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  const text = `Your password reset link: ${resetUrl}\nOr use this OTP: ${otp} (valid for 15 mins)`;

  // Send the email with the reset instructions
  await sendMail({
    to: user.email,
    subject: "Reset your password",
    text,
  });

  return NextResponse.json({ message: "Password reset instructions sent" });
}

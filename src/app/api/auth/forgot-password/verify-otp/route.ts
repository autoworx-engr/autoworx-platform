import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, otp } = await req.json();

  const token = await db.passwordResetToken.findFirst({
    where: {
      user: { email },
      otp,
      expiresAt: { gt: new Date() },
    },
  });

  if (!token) {
    return NextResponse.json(
      { error: "Invalid or expired OTP" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, token: token.token });
}

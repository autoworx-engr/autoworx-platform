"use server";
import { sendVerificationMail } from "@/actions/two-factor/send2faMail";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";

export async function sendEmailVerificationMail() {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!userId) {
      return { type: "fail", message: "User not found" };
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user) {
      return { type: "fail", message: "User not found" };
    }
    if (user.emailVerified) {
      return { type: "fail", message: "Email is already verified" };
    }
    const token = jwt.sign(
      { userId, email: user.email },
      process.env.ACCESS_SECRET || "",
      {
        expiresIn: "1h",
      },
    );
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
    await sendVerificationMail(user.email, url);
    return { type: "success", message: "Verification email sent successfully" };
  } catch (error) {
    const formattedError = errorHandler(error);
    return {
      type: "fail",
      message: formattedError?.message ?? "Failed to send verification email",
    };
  }
}

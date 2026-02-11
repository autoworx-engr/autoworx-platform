"use server";
import { sendVerificationMail } from "@/actions/estimate/invoice/sendInfobipEmail";
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
    await sendVerificationMail({
      to: user.email,
      subject: "Verify your email",
      text: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for registering with our service. Please click the link below to verify your email address:</p>
          <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not create this account, please ignore this email.</p>
        </div>
      `,
    });
    return { type: "success", message: "Verification email sent successfully" };
  } catch (error) {
    const formattedError = errorHandler(error);
    return {
      type: "fail",
      message: formattedError?.message ?? "Failed to send verification email",
    };
  }
}

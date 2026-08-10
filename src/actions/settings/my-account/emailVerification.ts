"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";

export async function emailVerification(token: string) {
  try {
    const { payload } = await jwtVerifyToken(token);
    const userId = Number(payload?.userId);
    const email = payload.email as string;
    if (!userId) {
      return { type: "fail", message: "User not found" };
    }
    const user = await db.user.findUnique({
      where: { id: userId, email },
      select: { id: true, emailVerified: true },
    });
    if (!user) {
      return { type: "fail", message: "User not found" };
    }
    if (user.emailVerified) {
      return { type: "fail", message: "Email is already verified" };
    }
    await db.user.update({
      where: { id: userId, email },
      data: { emailVerified: true },
    });
    return { type: "success", message: "Email verified successfully" };
  } catch (error) {
    const formattedError = errorHandler(error);
    return {
      type: "fail",
      message: formattedError.message ?? "Failed to verify email",
    };
  }
}

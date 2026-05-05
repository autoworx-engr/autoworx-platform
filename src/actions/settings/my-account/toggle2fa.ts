"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export async function enabled2fa() {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!userId) {
      return { type: "fail", message: "User not found" };
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true, emailVerified: true },
    });
    if (!user) {
      return { type: "fail", message: "User not found" };
    }
    if (user.twoFactorEnabled) {
      return { type: "fail", message: "2FA is already enabled" };
    }

    if (!user.emailVerified) {
      return { type: "fail", message: "Please verify your email first" };
    }

    await db.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { type: "success", message: "2FA enabled successfully" };
  } catch (err) {
    const formattedError = errorHandler(err);
    return {
      type: "fail",
      message: formattedError?.message ?? "Failed to enable 2FA",
    };
  }
}

export async function disabled2fa() {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!userId) {
      return { type: "fail", message: "User not found" };
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true },
    });
    if (!user) {
      return { type: "fail", message: "User not found" };
    }
    if (!user.twoFactorEnabled) {
      return { type: "fail", message: "2FA is already disabled" };
    }

    await db.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });
    return { type: "success", message: "2FA disabled successfully" };
  } catch (err) {
    const formattedError = errorHandler(err);
    return {
      type: "fail",
      message: formattedError?.message ?? "Failed to disable 2FA",
    };
  }
}

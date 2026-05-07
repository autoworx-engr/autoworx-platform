"use server";

import { AppError } from "@/error-boundary/error";
import { db } from "@/lib/db";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/tokenGenerator";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";

export default async function login(credentials: {
  email: string;
  password: string;
}) {
  try {
    const user = await db.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user || !user.password) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    const isPasswordMatched = await bcrypt.compare(
      credentials.password,
      user.password,
    );

    if (!isPasswordMatched) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    const newAccessToken = generateAccessToken(user) as string;
    const newRefreshToken = generateRefreshToken(user) as string;

    return {
      id: user.id.toString(),
      name: `${user.firstName} ${user.lastName ?? ""}`.trim(),
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      employeeType: user.employeeType,
      isSuperAdmin: user.isSuperAdmin,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error("Login error:", error);
    throw new AppError(httpStatus.UNAUTHORIZED, "Login failed");
  }
}

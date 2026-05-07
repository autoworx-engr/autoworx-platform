"use server";

import { AppError } from "@/error-boundary/error";
import { db } from "@/lib/db";
import { createUserValidation } from "@/validations/schemas/auth/user.validation";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";

interface RegisterData {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  company: string;
  accessCode: string;
  timezone: string;
}

interface Response {
  success?: boolean;
}

const ACCESS_CODE = process.env.ACCESS_CODE;

export async function register({
  firstName,
  lastName,
  email,
  password,
  company,
  accessCode,
  timezone,
}: RegisterData): Promise<Response> {
  const userInfo = await createUserValidation.parseAsync({
    firstName,
    lastName,
    email,
    password,
    company,
    accessCode,
  });

  if (accessCode !== ACCESS_CODE) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid access code");
  }

  const userEmail = userInfo.email;

  const existingUser = await db.user.findUnique({
    where: { email: userEmail },
  });

  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, "User already exists");
  }

  const SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 12);
  const hashedPassword = await bcrypt.hash(userInfo.password, SALT_ROUNDS);

  await db.$transaction(async (tx) => {
    const newCompany = await tx.company.create({
      data: {
        name: userInfo.company,
        timezone: timezone || "UTC",
      },
    });

    await tx.user.create({
      data: {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userEmail,
        password: hashedPassword,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        companyId: newCompany.id,
      },
    });
  });

  return { success: true };
}

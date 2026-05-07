"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

type TValues = {
  email: string;
  password: string;
};

export async function checkLoginWithTwoFactor(values: TValues): Promise<{
  type: string;
  message: string;
  twoFactor?: boolean;
  nextLogin?: boolean;
}> {
  const { email, password } = values;

  const existingUser = await db.user.findUnique({ where: { email } });

  if (!existingUser || !existingUser.password) {
    return { type: "fail", message: "Invalid credentials!" };
  }

  const passwordsMatch = await bcrypt.compare(password, existingUser.password);
  if (!passwordsMatch) {
    return { type: "fail", message: "Invalid credentials!" };
  }

  return { type: "success", message: "Login successful", nextLogin: true };
}

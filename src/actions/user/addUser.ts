"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function addUser({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
}: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<ServerAction> {
  if (password !== confirmPassword) {
    return {
      message: "Passwords do not match",
      field: "password",
      type: "error",
    };
  }

  const encPassword = await bcrypt.hash(password, 10);
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  await db.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: encPassword,
      role: "employee",
      companyId,
    },
  });

  revalidatePath("/task");
  revalidatePath("/employee");

  return {
    type: "success",
  };
}

"use server";

import { db } from "@/lib/db";

export const getUserById = async (id: number) => {
  try {
    const user = await db.user.findUnique({
      where: { id },
    });
    if (user) {
      return { type: "success", data: user };
    }
    return { type: "fail", data: null };
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : "Unknown error");
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const user = await db.user.findUnique({
      where: { email },
    });
    if (user) {
      return { type: "success", data: user };
    }
    return { type: "fail", data: null };
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : "Unknown error");
  }
};

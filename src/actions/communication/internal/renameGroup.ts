"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const renameGroup = async (name: string, groupId: number) => {
  try {
    await db.group.update({
      where: { id: groupId },
      data: {
        name,
      },
    });

    revalidatePath("/dashboard/communication/internal");

    return {
      status: 200,
      success: true,
      message: "Group renamed successfully",
    };
  } catch (err) {
    throw err;
  }
};

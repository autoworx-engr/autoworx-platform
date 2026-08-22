"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteInventory(id: number) {
  try {
    await db.inventoryProduct.delete({
      where: { id },
    });

    revalidatePath("/inventory");

    return { type: "success" };
  } catch (err) {
    return errorHandler(err);
  }
}

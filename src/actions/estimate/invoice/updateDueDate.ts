"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";

export async function updateDueDate(
  id: string,
  dueDate: string,
): Promise<ServerAction> {
  try {
    const invoice = await db.invoice.findUnique({
      where: {
        id,
      },
    });

    await db.invoice.update({
      where: {
        id,
      },
      data: {
        dueDate,
        isWorkOrder: true,
        workOrderCreatedAt: invoice?.workOrderCreatedAt || new Date(),
      },
    });

    revalidatePath("/dashboard/estimate/workorder");

    return {
      type: "success",
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

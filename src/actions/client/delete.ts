"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";

export async function deleteClient(id: number): Promise<ServerAction> {
  try {
    await db.client.delete({ where: { id } });

    revalidatePath("/dashboard/client");

    return {
      type: "success",
    };
  } catch (error) {
    return {
      type: "error",
      message: "Failed to delete client.",
    };
  }
}

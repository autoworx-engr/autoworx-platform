"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";

export async function deleteFleet(id: number): Promise<ServerAction> {
  const isExist = await db.client.findUnique({
    where: { id, isFleet: true },
  });

  if (!isExist) {
    throw new Error("The fleet not exist!");
  }
  await db.client.update({
    where: { id, isFleet: true },
    data: {
      isFleet: false,
    },
  });
  await db.fleet.delete({
    where: { clientId: id },
  });
  revalidatePath("/dashboard/fleet");

  return {
    type: "success",
  };
}

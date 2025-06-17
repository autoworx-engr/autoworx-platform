"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { Tag } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function deleteTag(id: number): Promise<ServerAction> {
  await db.tag.delete({
    where: {
      id,
    },
  });

  revalidatePath("/dashboard/pipeline/sales/pipeline");

  return {
    type: "success",
  };
}

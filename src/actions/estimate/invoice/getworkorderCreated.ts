"use server";

import { db } from "@/lib/db";

export async function getIsWorkorderCreated(id: string) {
  const invoice = await db.invoice.findFirst({
    where: { id },
    select: {
      isWorkOrder: true,
    },
  });

  return invoice;
}

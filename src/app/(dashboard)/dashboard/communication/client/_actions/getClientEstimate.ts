"use server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function getClientEstimate(
  clientId: number,
  params?: Prisma.InvoiceFindManyArgs,
) {
  try {
    const estimates = await db.invoice.findMany({
      where: { clientId: clientId, ...(params?.where || {}) },
      select: {
        type: true,
      },
      ...params,
    });
    return estimates;
  } catch (err) {
    throw err;
  }
}

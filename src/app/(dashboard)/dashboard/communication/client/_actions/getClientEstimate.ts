"use server";
import { db } from "@/lib/db";

export async function getClientEstimate(clientId: number) {
  try {
    const estimates = await db.invoice.findMany({
      where: { clientId: clientId },
      select: {
        type: true,
      },
    });
    return estimates;
  } catch (err) {
    throw err;
  }
}

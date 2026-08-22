"use server";
import { db } from "@/lib/db";

export async function fetchClientEstimates(clientId: number, skip: number) {
  const data = await db.invoice.findMany({
    where: { clientId },
    select: { id: true, type: true },
    skip,
    orderBy: { createdAt: "desc" },
  });
  return data;
}

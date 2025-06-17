"use server";
import { db } from "@/lib/db";

export const getInspections = async (invoiceId: string) => {
  const inspections = await db.invoiceInspection.findMany({
    where: {
      invoiceId,
    },
  });

  return inspections;
};

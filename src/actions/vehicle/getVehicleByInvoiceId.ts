"use server";
import { db } from "@/lib/db";
import { Vehicle } from "@prisma/client";

export async function getVehicleByInvoiceId(
  invoiceId: string,
): Promise<Vehicle | null> {
  if (!invoiceId) return null;
  const vehicleInfo = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { vehicle: true },
  });
  return vehicleInfo?.vehicle || null;
}

"use server";
import { db } from "@/lib/db";
import { VehicleParts } from "@prisma/client";

export const addVehicleParts = async (
  vehicleParts: Partial<VehicleParts>[],
  technicianId: number,
) => {
  try {
    await Promise.all(
      vehicleParts.map(async (part) => {
        return db.vehicleParts.create({
          data: {
            partsName: part.partsName as string,
            invoiceId: part.invoiceId as string,

            serviceId: part.serviceId ?? null,
            technicianId: technicianId,
          },
        });
      }),
    );
  } catch (err) {
    throw err;
  }
};

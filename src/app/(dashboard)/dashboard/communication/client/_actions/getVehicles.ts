"use server";
import { db } from "@/lib/db";

export async function getVehicles(clientId: number) {
  try {
    const vehicles = await db.vehicle.findMany({
      where: { clientId },
      select: {
        id: true,
        year: true,
        make: true,
        model: true,
      },
    });
    return vehicles;
  } catch (err) {
    throw err;
  }
}

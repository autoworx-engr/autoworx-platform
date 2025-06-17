"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";

export async function getVehicles(): Promise<ServerAction> {
  const companyId = await getCompanyId();

  const vehicles = await db.vehicle.findMany({
    where: {
      companyId,
    },
  });

  return {
    type: "success",
    data: vehicles,
  };
}

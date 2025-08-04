"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { Prisma } from "@prisma/client";

export async function getVehicles(
  params?: Prisma.VehicleFindManyArgs,
): Promise<ServerAction> {
  const companyId = await getCompanyId();

  const vehicles = await db.vehicle.findMany({
    where: {
      companyId,
      ...(params?.where || {}),
    },
    ...params,
  });

  return {
    type: "success",
    data: vehicles,
  };
}

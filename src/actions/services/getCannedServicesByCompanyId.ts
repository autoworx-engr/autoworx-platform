"use server";

import { db } from "@/lib/db";

export async function getCannedServicesByCompanyId(companyId: number) {
  try {
    const services = await db.service.findMany({
      where: {
        companyId: companyId,
        canned: true,
      },
    });

    return services;
  } catch (error) {
    console.error("Error fetching canned services by token:", error);
    throw error;
  }
}

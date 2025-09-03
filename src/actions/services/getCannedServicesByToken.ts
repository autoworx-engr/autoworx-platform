"use server";

import { db } from "@/lib/db";

export async function getCannedServicesByToken(token: string) {
  try {
    console.log({token});
    
    // Check if token is provided and not empty
    if (!token || token.trim() === '') {
      throw new Error("Token is required");
    }
    
    const company = await db.company.findUnique({
      where: {
        zapierToken: token,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      throw new Error("Company not found for provided token");
    }

    const services = await db.service.findMany({
      where: { 
        companyId: company.id,
        canned: true // Only fetch canned services
      },
    });

    return services;
  } catch (error) {
    console.error("Error fetching canned services by token:", error);
    throw error;
  }
}

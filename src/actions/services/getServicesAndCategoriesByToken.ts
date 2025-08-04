"use server";

import { db } from "@/lib/db";

export async function getServicesByToken(token: string) {
  try {
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
      where: { companyId: company.id },
    });

    return services;
  } catch (error) {
    console.error("Error fetching services by token:", error);
    throw error;
  }
}

export async function getCategoriesByToken(token: string) {
  try {
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

    const categories = await db.category.findMany({
      where: { companyId: company.id },
    });

    return categories;
  } catch (error) {
    console.error("Error fetching categories by token:", error);
    throw error;
  }
}

export async function getCompanyIdByToken(token: string): Promise<number> {
  try {
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

    return company.id;
  } catch (error) {
    console.error("Error fetching company ID by token:", error);
    throw error;
  }
}

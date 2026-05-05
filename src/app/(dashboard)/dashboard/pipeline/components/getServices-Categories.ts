"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export const getServices = async () => {
  const companyId = await getCompanyId();
  try {
    const services = await db.service.findMany({
      where: { companyId },
    });
    return services;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getCategories = async () => {
  const companyId = await getCompanyId();
  try {
    const categories = await db.category.findMany({
      where: { companyId },
    });
    return categories;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

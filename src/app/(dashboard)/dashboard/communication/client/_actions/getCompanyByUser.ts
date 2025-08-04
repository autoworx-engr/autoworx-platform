"use server";

import { db } from "@/lib/db";

export const getCompanyByUser = async (companyId: number) => {
  try {
    const company = await db.company.findFirst({
      where: { id: companyId },
      select: {
        email: true,
      },
    });
    return company;
  } catch (err) {
    throw err;
  }
};

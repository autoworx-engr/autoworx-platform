"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const getCompanyUser = async (params: Prisma.UserFindManyArgs = {}) => {
  const companyId = await getCompanyId();
  try {
    const user = await db.user.findMany({
      where: { companyId, ...(params.where || {}) },
      ...params,
    });
    return user;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

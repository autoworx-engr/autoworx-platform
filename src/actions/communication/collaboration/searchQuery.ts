"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export const searchCompanyQuery = async (searchTerm: string) => {
  const companyId = await getCompanyId();
  try {
    const companies = await db.company.findMany({
      where: {
        NOT: [{ id: companyId }],
        OR: [
          { name: { contains: searchTerm } },
          { website: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
        ],
        isCollaborators: true,
      },
      select: {
        id: true,
        name: true,
        users: {
          where: { role: "admin" },
          select: {
            firstName: true,
            lastName: true,
            companyId: true,
            email: true,
            role: true,
            image: true,
          },
        },
        companyJoinsAsOne: {
          where: {
            OR: [{ companyOneId: companyId }, { companyTwoId: companyId }],
          },
          select: {
            status: true,
            companyOneId: true,
            companyTwoId: true,
          },
        },
        companyJoinsAsTwo: {
          where: {
            OR: [{ companyOneId: companyId }, { companyTwoId: companyId }],
          },
          select: {
            status: true,
            companyOneId: true,
            companyTwoId: true,
          },
        },
      },
    });
    return {
      success: true,
      data: companies,
      companyId,
    };
  } catch (err: any) {
    throw new Error(err);
  }
};

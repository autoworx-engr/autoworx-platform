"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { User } from "@prisma/client";
import { getServerSession } from "next-auth";

import type { Prisma } from "@prisma/client";

export default async function getUsersForAdminOrManager(
  searchTerm: string = "",
  params?: Prisma.UserFindManyArgs,
) {
  try {
    const session = await getServerSession(authOptions);
    let users: User[] = [];
    let totalUsers = 0;
    const { where, ...restParams } = params || {};
    if (
      session?.user?.employeeType == "Admin" ||
      session?.user?.employeeType == "Manager"
    ) {
      let searchConditions: Prisma.UserWhereInput[] = [];

      if (searchTerm.trim()) {
        const trimmedSearch = searchTerm.trim();
        const searchWords = trimmedSearch
          .split(/\s+/)
          .filter((word) => word.length > 0);

        searchConditions.push(
          {
            firstName: {
              contains: trimmedSearch,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: trimmedSearch,
              mode: "insensitive",
            },
          },
        );

        if (searchWords.length >= 2) {
          searchConditions.push({
            AND: [
              {
                firstName: {
                  contains: searchWords[0],
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: searchWords[1],
                  mode: "insensitive",
                },
              },
            ],
          });

          searchConditions.push({
            AND: [
              {
                firstName: {
                  contains: searchWords[1],
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: searchWords[0],
                  mode: "insensitive",
                },
              },
            ],
          });
        }
      }

      const baseWhere: Prisma.UserWhereInput = {
        companyId: session?.user?.companyId,
        role: "employee",
        ...(searchConditions.length > 0 && { OR: searchConditions }),
        ...(where || {}),
      };

      totalUsers = await db.user.count({
        where: baseWhere,
      });

      users = await db.user.findMany({
        where: baseWhere,
        ...restParams,
      });
    }
    return { data: users, totalUsers };
  } catch (error) {
    console.error("Error in getTaskForAdminOrManager:", error);
    throw error;
  }
}

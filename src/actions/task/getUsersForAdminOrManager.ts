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
      totalUsers = await db.user.count({
        where: {
          companyId: session?.user?.companyId,
          role: "employee",
        },
      });
      users = await db.user.findMany({
        where: {
          companyId: session?.user?.companyId,
          role: "employee",
          OR: [
            {
              firstName: {
                contains: searchTerm,
              },
            },
            {
              lastName: {
                contains: searchTerm,
              },
            },
          ],
          ...(where || {}),
        },
        ...restParams,
      });
    }
    return { data: users, totalUsers };
  } catch (error) {
    console.error("Error in getTaskForAdminOrManager:", error);
    throw error;
  }
}

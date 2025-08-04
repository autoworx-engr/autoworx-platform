import { db } from "@/lib/db";
import { EmployeeType, Prisma } from "@prisma/client";

// get users by role utility function
export const getUsersByRole = async (
  companyId: number,
  roles: EmployeeType[],
  select: Prisma.UserSelect,
) => {
  try {
    const users = await db.user.findMany({
      where: {
        companyId,
        employeeType: {
          in: roles,
        },
      },
      select,
    });
    return users;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

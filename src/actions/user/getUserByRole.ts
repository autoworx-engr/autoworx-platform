import { db } from "@/lib/db";
import { EmployeeType, Prisma } from "@prisma/client";

// get users by role utility function

export const getUsersByRole = async <T extends Record<string, any>>(
  companyId: number,
  roles: EmployeeType[],
  select: T,
): Promise<Prisma.UserGetPayload<{ select: T }>[]> => {
  try {
    const company = await db.company.findUnique({
      where: {
        id: companyId,
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    const users = await db.user.findMany({
      where: {
        companyId,
        employeeType: {
          in: roles,
        },
      },

      select: select as any,
    });

    return users as any;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

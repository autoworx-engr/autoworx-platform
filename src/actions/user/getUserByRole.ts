import { db } from "@/lib/db";
import { EmployeeType, Prisma } from "@prisma/client";

// get users by role utility function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getUsersByRole = async <T extends Record<string, any>>(
  companyId: number,
  roles: EmployeeType[],
  select: T,
): Promise<Prisma.UserGetPayload<{ select: T }>[]> => {
  try {
    const users = await db.user.findMany({
      where: {
        companyId,
        employeeType: {
          in: roles,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: select as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return users as any;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

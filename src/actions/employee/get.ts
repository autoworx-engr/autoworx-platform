"use server";
import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { EmployeeType } from "@prisma/client";
import { getServerSession } from "next-auth";

// Get all the employees of a company
export async function getEmployees({
  excludeCurrentUser,
  type,
  notType,
}: {
  excludeCurrentUser?: boolean;
  type?: EmployeeType;
  notType?: EmployeeType;
}) {
  const companyId = await getCompanyId();
  const session = await getServerSession(authOptions);
  const employees = await db.user.findMany({
    where: {
      companyId,
      id: {
        not: excludeCurrentUser ? parseInt(session?.user?.id!) : undefined,
      },
      employeeType: {
        equals: type,
        not: notType,
      },
    },
  });
  return employees;
}

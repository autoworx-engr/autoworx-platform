"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { EmployeeType, Prisma } from "@prisma/client";

export type EmployeeFilterOption = {
  id: number;
  firstName: string;
  lastName: string | null;
};

// Paged source for the "All Employees" filter dropdown — the list is fetched a
// page at a time as the panel is scrolled instead of shipping every employee
// with the page render.
export async function getEmployeeFilterOptions(
  skip: number,
  take: number,
  employeeType?: EmployeeType,
  search?: string,
) {
  const companyId = await getCompanyId();

  const where: Prisma.UserWhereInput = {
    companyId,
    ...(employeeType && { employeeType }),
  };

  const trimmed = search?.trim();
  if (trimmed) {
    where.AND = trimmed.split(/\s+/).map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
      ],
    }));
  }

  const [employees, total] = await Promise.all([
    db.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true },
      orderBy: { createdAt: "asc" },
      skip,
      take,
    }),
    db.user.count({ where }),
  ]);

  return { employees, total, hasMore: skip + take < total };
}

// Resolves the label for an already-selected employee that may sit on a page the
// dropdown has not loaded yet.
export async function getEmployeeFilterOption(userId: number) {
  const companyId = await getCompanyId();
  return db.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true, firstName: true, lastName: true },
  });
}

"use server";
import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getPaddedIdSearchCondition } from "@/lib/padId";
import { EmployeeType, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { cache } from "react";
// Get all the employees of a company
export async function getEmployees({
  excludeCurrentUser,
  type,
  notType,
  companyId: providedCompanyId,
  currentUserId: providedUserId,
}: {
  excludeCurrentUser?: boolean;
  type?: EmployeeType;
  notType?: EmployeeType;
  companyId?: number;
  currentUserId?: number;
}) {
  const companyId = providedCompanyId ?? (await getCompanyId());
  const currentUserId =
    providedUserId ??
    (excludeCurrentUser
      ? parseInt((await getServerSession(authOptions))?.user?.id!)
      : undefined);
  const employees = await db.user.findMany({
    where: {
      companyId,
      id: {
        not: excludeCurrentUser ? currentUserId : undefined,
      },
      employeeType: {
        equals: type,
        not: notType,
      },
    },
  });
  return employees;
}

type EmployeeParams = {
  companyId: number;
  take: number;
  page: number;
  filter?: {
    type?: EmployeeType;
    searchParams?: string;
    dateRange?: { startDate: string; endDate: string };
  };
};
export const getEmployeesForPaginate = cache(
  async ({ companyId, page, take, filter }: EmployeeParams) => {
    const whereClause: Prisma.UserWhereInput = {
      companyId,
    };

    if (filter?.type) {
      whereClause.employeeType = filter.type;
    }

    if (filter?.searchParams?.trim()) {
      const trimmed = filter.searchParams.trim();
      const idCondition = getPaddedIdSearchCondition(trimmed);

      whereClause.OR = trimmed
        .split(/\s+/)
        .flatMap((searchText) => [
          { firstName: { contains: searchText, mode: "insensitive" } },
          { lastName: { contains: searchText, mode: "insensitive" } },
          { email: { contains: searchText, mode: "insensitive" } },
          { phone: { contains: searchText, mode: "insensitive" } },
        ]) as Prisma.UserWhereInput[];
      if (idCondition) whereClause.OR.push(idCondition);
    }

    if (
      filter?.dateRange &&
      filter.dateRange.startDate &&
      filter.dateRange.endDate
    ) {
      const start = new Date(filter.dateRange.startDate + "T00:00:00.000Z");
      const end = new Date(filter.dateRange.endDate + "T23:59:59.999Z");

      whereClause.joinDate = {
        gte: start,
        lte: end,
      };
    }

    const totalEmployees = await db.user.count({
      where: whereClause,
    });
    const employees = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        joinDate: true,
        createdAt: true,
        employeeType: true,
        phone: true,
        commission: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        companyName: true,
        image: true,
        countryCode: true,
        salaryHistory: {
          where: {
            isActive: true,
          },
          select: {
            salaryType: true,
            salaryAmount: true,
            startDate: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      take,
      skip: (page - 1) * take,
      orderBy: {
        joinDate: "desc",
      },
    });
    return { employees, totalEmployees };
  },
);

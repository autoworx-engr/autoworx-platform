"use server";
import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { EmployeeType, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { cache } from "react";
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

type EmployeeParams = {
  companyId: number;
  take: number;
  page: number;
  filter?: {
    type?: EmployeeType;
    searchParams?: string;
    dateRange?: { startDate: Date; endDate: Date };
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

    if (filter?.searchParams) {
      const trimmed = filter?.searchParams.trim();
      const numericId = /^\d+$/.test(trimmed) ? Number(trimmed) : null;
      whereClause.OR = filter.searchParams
        .split(" ")
        .flatMap(searchText => [
          { firstName: { contains: searchText, mode: "insensitive" } },
          { lastName: { contains: searchText, mode: "insensitive" } },
          { email: { contains: searchText, mode: "insensitive" } },
          { phone: { contains: searchText, mode: "insensitive" } },
        ]) as Prisma.UserWhereInput[];
      whereClause.OR.push(
        ...(numericId !== null ? [{ id: numericId }] : [])
      )
    }

    if (
      filter?.dateRange &&
      filter.dateRange.startDate &&
      filter.dateRange.endDate
    ) {
      whereClause.joinDate = {
        gte: filter.dateRange.startDate,
        lte: filter.dateRange.endDate,
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
  }
);

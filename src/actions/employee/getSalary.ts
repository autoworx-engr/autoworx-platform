"use server";

import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { manageSalaryHistory } from "@/lib/salaryHistoryManager";
import { getServerSession } from "next-auth";
import { SalaryType } from "@prisma/client";

interface SalaryUpdateRequest {
  userId: number;
  salaryType: SalaryType;
  salaryAmount: number;
}

/**
 * Get current salary information for an employee
 */
export async function getEmployeeSalary(userId: number) {
  try {
    const companyId = await getCompanyId();

    const salaryHistory = await db.salaryHistory.findFirst({
      where: {
        userId,
        companyId,
        isActive: true,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return {
      type: "success" as const,
      data: salaryHistory,
    };
  } catch (error) {
    console.error("Error fetching salary:", error);
    return {
      type: "error" as const,
      message: "Failed to fetch salary information",
    };
  }
}

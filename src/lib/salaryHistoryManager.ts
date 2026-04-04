/**
 * Salary History Management
 *
 * This module manages salary history records to ensure proper payout calculations
 * when salary types or amounts change over time.
 */

import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { SalaryType } from "@prisma/client";

/**
 * Create or update salary history for a user
 * Automatically manages the previous salary record's end date
 */
export async function manageSalaryHistory({
  userId,
  salaryType,
  salaryAmount,
  startDate,
}: {
  userId: number;
  salaryType: SalaryType;
  salaryAmount: number;
  startDate?: Date;
}): Promise<void> {
  const companyId = await getCompanyId();
  const { timezone } = await getCompanyTimezone();

  // Get the effective start date in company timezone
  const effectiveStartDate = startDate || new Date();

  // Convert to company timezone for consistent tracking
  const timezoneAdjustedDate = new Date(
    effectiveStartDate.toLocaleString("en-US", { timeZone: timezone }),
  );

  await db.$transaction(async (tx) => {
    // Check if user has an active salary record
    console.log("manageSalaryHistory", userId, companyId);
    const activeSalary = await tx.salaryHistory.findFirst({
      where: {
        userId,
        companyId,
        isActive: true,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    // If there's an active salary and it's different from the new one
    if (
      activeSalary &&
      (activeSalary.salaryType !== salaryType ||
        Number(activeSalary.salaryAmount) !== salaryAmount)
    ) {
      // End the previous salary record
      const endDate = new Date(timezoneAdjustedDate.getTime() - 1); // End 1ms before new salary starts

      await tx.salaryHistory.update({
        where: { id: activeSalary.id },
        data: {
          endDate,
          isActive: false,
        },
      });
    }

    // Don't create a new record if it's exactly the same as the active one
    if (
      activeSalary &&
      activeSalary.salaryType === salaryType &&
      Number(activeSalary.salaryAmount) === salaryAmount
    ) {
      return;
    }

    // Create new salary history record
    await tx.salaryHistory.create({
      data: {
        userId,
        companyId,
        salaryType,
        salaryAmount,
        startDate: timezoneAdjustedDate,
        isActive: true,
      },
    });
  });
}

/**
 * Get active salary configuration for a user
 */
export async function getActiveSalary(userId: number, currentCompany: number) {
  let cId = currentCompany;

  if (cId) {
    cId = await getCompanyId();
  }

  return await db.salaryHistory.findFirst({
    where: {
      userId,
      companyId: cId,
      isActive: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });
}

/**
 * Get salary history for a specific period
 * This is used for payout calculations across different salary configurations
 */
export async function getSalaryHistoryForPeriod(
  userId: number,
  periodStart: Date,
  periodEnd: Date,
) {
  const companyId = await getCompanyId();

  return await db.salaryHistory.findMany({
    where: {
      userId,
      companyId,
      OR: [
        // Salary started before period and ended during or after period
        {
          startDate: { lte: periodEnd },
          OR: [
            { endDate: { gte: periodStart } },
            { endDate: null }, // Still active
          ],
        },
      ],
    },
    orderBy: {
      startDate: "asc",
    },
  });
}

/**
 * Check if user has any salary configuration
 */
export async function checkIfUserHasSalaryHistory(
  userId: number,
): Promise<boolean> {
  const companyId = await getCompanyId();

  const salaryRecord = await db.salaryHistory.findFirst({
    where: {
      userId,
      companyId,
    },
  });

  return !!salaryRecord;
}

/**
 * Get user's current salary information (backwards compatibility)
 * Returns the active salary in the old format for existing code
 */
export async function getUserSalaryInfo(
  userId: number,
  currentCompany: number,
) {
  const activeSalary = await getActiveSalary(userId, currentCompany);

  if (!activeSalary) {
    return {
      salaryType: null,
      salaryAmount: null,
      salaryStartedAt: null,
    };
  }

  return {
    salaryType: activeSalary.salaryType,
    salaryAmount: activeSalary.salaryAmount,
    salaryStartedAt: activeSalary.startDate,
  };
}

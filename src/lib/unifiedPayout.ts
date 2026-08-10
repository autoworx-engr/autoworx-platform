/**
 * Unified Payout System
 *
 * This module provides a unified approach to calculate employee payouts by combining:
 * 1. Work-based earnings (from completed jobs/tasks)
 * 2. Salary-based earnings (if the employee has salary configuration)
 *
 * The system automatically:
 * - Calculates work-based earnings for all employees
 * - Adds salary earnings on top if the employee has salary setup
 * - Provides breakdown information for transparency
 *
 * This ensures that employees can receive both work-based compensation
 * and salary compensation simultaneously.
 */

import {
  calculatePreviousMonthEarnings,
  calculateCurrentMonthEarnings,
  calculate2ndPreviousMonthEarnings,
  calculateTotalEarnings,
  History,
} from "@/lib/payout";
import {
  calculateSalaryPreviousMonthEarnings,
  calculateSalaryCurrentMonthEarnings,
  calculateSalary2ndPreviousMonthEarnings,
  calculateSalaryTotalEarnings,
} from "@/lib/salaryPayout";
import { checkIfUserHasSalaryHistory } from "@/lib/salaryHistoryManager";
import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

/**
 * Check if the user has salary information configured
 */
export async function checkIfUserHasSalary(
  targetUserId?: number,
): Promise<boolean> {
  try {
    const companyId = await getCompanyId();

    let userId: number;
    if (targetUserId) {
      userId = targetUserId;
    } else {
      const session = await getServerSession(authOptions);
      userId = Number(session?.user?.id as string);
    }

    return await checkIfUserHasSalaryHistory(userId);
  } catch (error) {
    console.error("Error checking salary configuration:", error);
    return false;
  }
}

/**
 * Calculate unified previous month earnings (salary + work-based)
 */
export async function calculateUnifiedPreviousMonthEarnings(
  workInfo: History[],
): Promise<number> {
  // Extract user ID from workInfo (technician data)
  const userId = workInfo.length > 0 ? (workInfo[0] as any).userId : undefined;
  const hasSalary = await checkIfUserHasSalary(userId);

  // Always calculate work-based earnings
  const workBasedEarnings = await calculatePreviousMonthEarnings(workInfo);

  if (!hasSalary) {
    return workBasedEarnings;
  }

  // Calculate salary-based earnings and add to work-based
  const salaryEarnings = await calculateSalaryPreviousMonthEarnings(userId);

  return workBasedEarnings + salaryEarnings;
}

/**
 * Calculate unified current month earnings (salary + work-based)
 */
export async function calculateUnifiedCurrentMonthEarnings(
  workInfo: History[],
): Promise<number> {
  // Extract user ID from workInfo (technician data)
  const userId = workInfo.length > 0 ? (workInfo[0] as any).userId : undefined;
  const hasSalary = await checkIfUserHasSalary(userId);

  // Always calculate work-based earnings
  const workBasedEarnings = await calculateCurrentMonthEarnings(workInfo);

  if (!hasSalary) {
    return workBasedEarnings;
  }

  // Calculate salary-based earnings and add to work-based
  const salaryEarnings = await calculateSalaryCurrentMonthEarnings(userId);

  return workBasedEarnings + salaryEarnings;
}

/**
 * Calculate unified second previous month earnings (salary + work-based)
 */
export async function calculateUnified2ndPreviousMonthEarnings(
  workInfo: History[],
): Promise<number> {
  // Extract user ID from workInfo (technician data)
  const userId = workInfo.length > 0 ? (workInfo[0] as any).userId : undefined;
  const hasSalary = await checkIfUserHasSalary(userId);

  // Always calculate work-based earnings
  const workBasedEarnings = await calculate2ndPreviousMonthEarnings(workInfo);

  if (!hasSalary) {
    return workBasedEarnings;
  }

  // Calculate salary-based earnings and add to work-based
  const salaryEarnings = await calculateSalary2ndPreviousMonthEarnings(userId);

  return workBasedEarnings + salaryEarnings;
}

/**
 * Calculate unified total earnings (salary + work-based)
 */
export async function calculateUnifiedTotalEarnings(
  workInfo: History[],
): Promise<number> {
  // Extract user ID from workInfo (technician data)
  const userId = workInfo.length > 0 ? (workInfo[0] as any).userId : undefined;
  const hasSalary = await checkIfUserHasSalary(userId);

  // Always calculate work-based earnings (total from all work)
  const workBasedEarnings = calculateTotalEarnings(workInfo);

  if (!hasSalary) {
    return workBasedEarnings;
  }

  // Calculate salary-based earnings and add to work-based
  const salaryEarnings = await calculateSalaryTotalEarnings(userId);

  return workBasedEarnings + salaryEarnings;
}

/**
 * Get breakdown of earnings for transparency
 */
export async function getEarningsBreakdown(workInfo: History[]) {
  // Extract user ID from workInfo (technician data)
  const userId = workInfo.length > 0 ? (workInfo[0] as any).userId : undefined;
  const hasSalary = await checkIfUserHasSalary(userId);

  const workBasedPrevious = await calculatePreviousMonthEarnings(workInfo);
  const workBasedCurrent = await calculateCurrentMonthEarnings(workInfo);
  const workBased2ndPrevious =
    await calculate2ndPreviousMonthEarnings(workInfo);
  const workBasedTotal = calculateTotalEarnings(workInfo);

  if (!hasSalary) {
    return {
      hasSalary: false,
      workBased: {
        previous: workBasedPrevious,
        current: workBasedCurrent,
        secondPrevious: workBased2ndPrevious,
        total: workBasedTotal,
      },
      salary: {
        previous: 0,
        current: 0,
        secondPrevious: 0,
        total: 0,
      },
      combined: {
        previous: workBasedPrevious,
        current: workBasedCurrent,
        secondPrevious: workBased2ndPrevious,
        total: workBasedTotal,
      },
    };
  }

  const salaryPrevious = await calculateSalaryPreviousMonthEarnings(userId);
  const salaryCurrent = await calculateSalaryCurrentMonthEarnings(userId);
  const salary2ndPrevious =
    await calculateSalary2ndPreviousMonthEarnings(userId);
  const salaryTotal = await calculateSalaryTotalEarnings(userId);

  return {
    hasSalary: true,
    workBased: {
      previous: workBasedPrevious,
      current: workBasedCurrent,
      secondPrevious: workBased2ndPrevious,
      total: workBasedTotal,
    },
    salary: {
      previous: salaryPrevious,
      current: salaryCurrent,
      secondPrevious: salary2ndPrevious,
      total: salaryTotal,
    },
    combined: {
      previous: workBasedPrevious + salaryPrevious,
      current: workBasedCurrent + salaryCurrent,
      secondPrevious: workBased2ndPrevious + salary2ndPrevious,
      total: workBasedTotal + salaryTotal,
    },
  };
}

/**
 * Company-wide unified payout calculations (for admin/manager dashboards)
 * These functions calculate totals across all technicians, including both work-based and salary earnings
 */

/**
 * Calculate company-wide unified current month earnings
 */
export async function calculateCompanyUnifiedCurrentMonthEarnings(
  companyId: number,
): Promise<number> {
  // Get all technicians for the company
  const technicians = await db.technician.findMany({
    where: { companyId },
  });

  // Group technicians by userId to get unique users
  const userTechnicianMap = new Map<number, any[]>();
  technicians.forEach((tech) => {
    if (!userTechnicianMap.has(tech.userId)) {
      userTechnicianMap.set(tech.userId, []);
    }
    userTechnicianMap.get(tech.userId)!.push(tech);
  });

  let totalEarnings = 0;

  // Calculate unified earnings for each user
  const promises = Array.from(userTechnicianMap.entries()).map(
    async ([userId, userTechnicians]) => {
      return await calculateUnifiedCurrentMonthEarnings(userTechnicians);
    },
  );

  const earnings = await Promise.all(promises);
  totalEarnings = earnings.reduce((sum, earning) => sum + earning, 0);

  return totalEarnings;
}

/**
 * Calculate company-wide unified previous month earnings
 */
export async function calculateCompanyUnifiedPreviousMonthEarnings(
  companyId: number,
): Promise<number> {
  // Get all technicians for the company
  const technicians = await db.technician.findMany({
    where: { companyId },
  });

  // Group technicians by userId to get unique users
  const userTechnicianMap = new Map<number, any[]>();
  technicians.forEach((tech) => {
    if (!userTechnicianMap.has(tech.userId)) {
      userTechnicianMap.set(tech.userId, []);
    }
    userTechnicianMap.get(tech.userId)!.push(tech);
  });

  let totalEarnings = 0;

  // Calculate unified earnings for each user
  const promises = Array.from(userTechnicianMap.entries()).map(
    async ([userId, userTechnicians]) => {
      return await calculateUnifiedPreviousMonthEarnings(userTechnicians);
    },
  );

  const earnings = await Promise.all(promises);
  totalEarnings = earnings.reduce((sum, earning) => sum + earning, 0);

  return totalEarnings;
}

/**
 * Calculate company-wide unified total earnings (YTD)
 */
export async function calculateCompanyUnifiedTotalEarnings(
  companyId: number,
): Promise<number> {
  // Get all technicians for the company
  const technicians = await db.technician.findMany({
    where: { companyId },
  });

  // Group technicians by userId to get unique users
  const userTechnicianMap = new Map<number, any[]>();
  technicians.forEach((tech) => {
    if (!userTechnicianMap.has(tech.userId)) {
      userTechnicianMap.set(tech.userId, []);
    }
    userTechnicianMap.get(tech.userId)!.push(tech);
  });

  let totalEarnings = 0;

  // Calculate unified earnings for each user
  const promises = Array.from(userTechnicianMap.entries()).map(
    async ([userId, userTechnicians]) => {
      return await calculateUnifiedTotalEarnings(userTechnicians);
    },
  );

  const earnings = await Promise.all(promises);
  totalEarnings = earnings.reduce((sum, earning) => sum + earning, 0);

  return totalEarnings;
}

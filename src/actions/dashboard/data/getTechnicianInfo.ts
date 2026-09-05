"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { getEssentials } from "@/lib/auth-utils";
import { getDateRanges, growthRate } from "./lib";
import { getSalaryPayouts } from "./getSalaryPayouts";
import { TECHNICIAN_STATUS } from "@/lib/consts";
import { getInvoiceItemTitle } from "@/utils/invoiceItemTitle";

/**
 * Get technician information including performance, monthly payout, and current projects.
 */
export async function getTechnicianInfo(timezone: string) {
  const performance = await getPerformance(timezone);
  const monthlyPayout = await getMonthlyPayout(timezone);
  const salaryPayouts = await getSalaryPayouts(timezone);
  const currentProjects = await getCurrentProjects();

  return {
    performance,
    monthlyPayout,
    salaryPayouts,
    currentProjects,
  };
}

/**
 * Get current projects for the technician.
 */
export interface CurrentProject {
  id: string;
  services: {
    name: string | undefined;
    due: Date | null;
    startDate: Date | null;
  }[];
  yearMakeModel: string;
  totalPayout: number;
  dueDate: Date | null;
  startDate: Date | null;
  status: {
    id: number;
    name: string;
    textColor: string;
    bgColor: string;
  } | null;
  column: {
    id: number;
    title: string;
    textColor: string | null;
    bgColor: string | null;
  } | null;
}
export async function getCurrentProjects(
  currentUserId?: number,
  currentCompanyId?: number,
) {
  let userId = currentUserId;
  let companyId = currentCompanyId;

  if (!userId || !companyId) {
    const data = await getEssentials();
    if (!userId) userId = data?.userId;
    if (!companyId) companyId = data?.companyId;
  }

  // Get all invoices where the technician is the current user and the status is "In Progress"
  const invoices = await db.invoice.findMany({
    where: {
      companyId,
      type: "Invoice",
      technician: {
        some: {
          userId,
          // status: "In Progress",
        },
      },
      column: {
        NOT: {
          title: "Delivered",
        },
      },
    },
    include: {
      technician: {
        include: {
          service: true,
          invoiceItem: {
            include: { service: true, labor: true, materials: true },
          },
        },
      },
      vehicle: true,
      status: true,
      column: true,
    },
  });

  // Map invoices to projects where the technician is the current user
  const projects = invoices.map((invoice) => {
    const technicians = invoice.technician.filter(
      (technician) => technician.userId === userId,
    );

    const totalPayout = technicians.reduce(
      (acc, technician) => acc + Number(technician.amount),
      0,
    );

    // Get the earliest start date from technicians
    const earliestStartDate = technicians.reduce<Date | null>(
      (earliest, technician) => {
        if (!technician.date) return earliest;
        if (!earliest) return technician.date;
        return technician.date < earliest ? technician.date : earliest;
      },
      null,
    );

    // Get the latest due date from technicians
    const latestDueDate = technicians.reduce<Date | null>(
      (latest, technician) => {
        if (!technician.due) return latest;
        if (!latest) return technician.due;
        return technician.due > latest ? technician.due : latest;
      },
      null,
    );

    return {
      id: invoice.id,
      services: technicians.map((technician) => ({
        name:
          technician.service?.name ||
          getInvoiceItemTitle(technician.invoiceItem),
        due: technician.due,
        startDate: technician.date,
      })),
      yearMakeModel: `${invoice?.vehicle?.year || ""} ${invoice.vehicle?.make || ""} ${invoice.vehicle?.model || ""} ${invoice.vehicle?.other || ""}`,
      totalPayout,
      dueDate: latestDueDate,
      startDate: earliestStartDate,
      status: invoice.status
        ? {
            id: invoice.status.id,
            name: invoice.status.name,
            textColor: invoice.status.textColor,
            bgColor: invoice.status.bgColor,
          }
        : null,
      column: invoice.column
        ? {
            id: invoice.column.id,
            title: invoice.column.title,
            textColor: invoice.column.textColor,
            bgColor: invoice.column.bgColor,
          }
        : null,
    };
  });

  return projects;
}

/**
 * Get performance metrics for the technician.
 */
export async function getPerformance(timezone: string, currentUserId?: number) {
  let userId = currentUserId;

  if (!userId) {
    const data = await getEssentials();
    userId = data?.userId;
  }

  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  // Get all jobs for the current month
  const currentMonthJobs = await db.technician.findMany({
    where: {
      userId,
      status: TECHNICIAN_STATUS.COMPLETE,
      date: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
  });

  // Calculate on-time completion rate for the current month
  const onTimeJobs = currentMonthJobs.filter(
    (job) =>
      job.status === TECHNICIAN_STATUS.COMPLETE && job.dateClosed! <= job.due!,
  );
  const onTimeCompletionRate =
    currentMonthJobs.length > 0
      ? onTimeJobs.length / currentMonthJobs.length
      : 0;

  // Get all jobs for the previous month
  const previousMonthJobs = await db.technician.findMany({
    where: {
      userId,
      date: {
        gte: previousMonthStart,
        lte: previousMonthEnd,
      },
    },
  });

  // Calculate on-time completion rate for the previous month
  const previousOnTimeJobs = previousMonthJobs.filter(
    (job) =>
      job.status === TECHNICIAN_STATUS.COMPLETE && job.dateClosed! <= job.due!,
  );
  const previousOnTimeCompletionRate =
    previousMonthJobs.length > 0
      ? previousOnTimeJobs.length / previousMonthJobs.length
      : 0;

  // Get redo jobs for the current and previous months
  const currentMonthRedoJobs = await db.invoiceRedo.count({
    where: {
      technicianId: userId,
      createdAt: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
  });

  const previousMonthRedoJobs = await db.invoiceRedo.count({
    where: {
      technicianId: userId,
      createdAt: {
        gte: previousMonthStart,
        lte: previousMonthEnd,
      },
    },
  });

  const currentMonthJobsLength = currentMonthJobs?.length ?? 0;
  const previousMonthJobsLength = previousMonthJobs?.length ?? 0;
  return {
    totalJobs: {
      count: currentMonthJobsLength,
      growth: growthRate(currentMonthJobsLength, previousMonthJobsLength),
    },
    onTimeCompletionRate: {
      rate: onTimeCompletionRate,
      growth: growthRate(onTimeCompletionRate, previousOnTimeCompletionRate),
    },
    redoJobs: {
      count: currentMonthRedoJobs,
      growth: growthRate(currentMonthRedoJobs, previousMonthRedoJobs),
    },
  };
}

/**
 * Get monthly payout for the technician.
 */
export async function getMonthlyPayout(
  timezone: string,
  currentUserId?: number,
) {
  let userId = currentUserId;

  if (!userId) {
    const data = await getEssentials();
    userId = data?.userId;
  }

  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  // Get completed jobs for the current month
  const completedJobs = await db.technician.findMany({
    where: {
      userId,
      date: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
      status: TECHNICIAN_STATUS.COMPLETE,
    },
  });

  const totalPayout = completedJobs.reduce(
    (acc, job) => acc + Number(job.amount),
    0,
  );

  // Get pending jobs for the current month
  const pendingJobs = await db.technician.findMany({
    where: {
      userId,
      date: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
      status: {
        notIn: [TECHNICIAN_STATUS.COMPLETE, TECHNICIAN_STATUS.CANCEL],
      },
    },
  });

  const pendingPayout = pendingJobs.reduce(
    (acc, job) => acc + Number(job.amount),
    0,
  );

  // Get completed jobs for the previous month
  const previousMonthCompletedJobs = await db.technician.findMany({
    where: {
      userId,
      date: {
        gte: previousMonthStart,
        lte: previousMonthEnd,
      },
      status: TECHNICIAN_STATUS.COMPLETE,
    },
  });

  const previousTotalPayout = previousMonthCompletedJobs.reduce(
    (acc, job) => acc + Number(job.amount),
    0,
  );

  return {
    totalPayout,
    pendingPayout,
    growth: growthRate(totalPayout, previousTotalPayout),
  };
}

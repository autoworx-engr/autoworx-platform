"use server";

import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { getDateRanges, growthRate } from "./lib";
import { getSalaryPayouts } from "./getSalaryPayouts";

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
}
export async function getCurrentProjects() {
  const { companyId, userId } = await getEssentials();

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
        },
      },
      vehicle: true,
    },
  });

  // Map invoices to projects where the technician is the current user
  const projects = invoices.map(invoice => {
    const technicians = invoice.technician.filter(
      technician => technician.userId === userId,
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

    // Get the earliest due date from technicians
    const earliestDueDate = technicians.reduce<Date | null>(
      (earliest, technician) => {
        if (!technician.due) return earliest;
        if (!earliest) return technician.due;
        return technician.due < earliest ? technician.due : earliest;
      },
      null,
    );

    return {
      id: invoice.id,
      services: technicians.map(technician => ({
        name: technician.service?.name,
        due: technician.due,
        startDate: technician.date,
      })),
      yearMakeModel: `${invoice?.vehicle?.year || ""} ${invoice.vehicle?.make || ""} ${invoice.vehicle?.model || ""} ${invoice.vehicle?.other || ""}`,
      totalPayout,
      dueDate: earliestDueDate, // Now using technician due date instead of invoice due date
      startDate: earliestStartDate,
    };
  });

  return projects;
}

/**
 * Get performance metrics for the technician.
 */
export async function getPerformance(timezone: string) {
  const { userId } = await getEssentials();
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
      date: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
  });

  // Calculate on-time completion rate for the current month
  const onTimeJobs = currentMonthJobs.filter(
    job => job.status === "Completed" && job.dateClosed! <= job.due!,
  );
  const onTimeCompletionRate = onTimeJobs.length / currentMonthJobs.length;

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
    job => job.status === "Completed" && job.dateClosed! <= job.due!,
  );
  const previousOnTimeCompletionRate =
    previousOnTimeJobs.length / previousMonthJobs.length;

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
export async function getMonthlyPayout(timezone: string) {
  const { userId } = await getEssentials();
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
      status: "Complete",
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
        notIn: ["Complete", "Cancel"],
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
      status: "Complete",
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

/**
 * Get essential information including companyId and userId.
 */
export async function getEssentials() {
  const companyId = await getCompanyId();
  const session = await getServerSession(authOptions);

  const userId = Number(session?.user?.id as string);

  return {
    companyId,
    userId,
  };
}

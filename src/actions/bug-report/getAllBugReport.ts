"use server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getAllBugReport(
  params: Prisma.BugReportFindManyArgs = {},
) {
  try {
    const allReports = await db.bugReport.findMany({
      include: {
        company: true,
        BugReportMessage: {
          orderBy: { createdAt: "desc" },
          include: {
            attachment: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
      take: params.take,
    });

    return allReports;
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}

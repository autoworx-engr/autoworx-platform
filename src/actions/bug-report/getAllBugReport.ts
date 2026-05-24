"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export default async function getAllBugReport(params: { take?: number } = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

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
    throw new Error(`Failed to get bug reports`);
  }
}

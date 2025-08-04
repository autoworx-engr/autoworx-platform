"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export default async function getCompanyAllBugReport() {
  const companyId = await getCompanyId();
  try {
    const allReports = await db.bugReport.findMany({
      where: {
        companyId,
      },
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
    });

    return allReports;
  } catch (error) {
    throw new Error(`Failed to get all bug report based on company!`);
  }
}

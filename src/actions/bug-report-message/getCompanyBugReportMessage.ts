"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export default async function getCompanyBugReportMessage({
  bugReportId,
}: {
  bugReportId: number;
}) {
  const companyId = await getCompanyId();

  const isExistBugReport = await db.bugReport.findFirst({
    where: {
      companyId: companyId,
      id: bugReportId,
    },
  });

  if (!isExistBugReport) {
    throw new Error(`Bug report not found based on your company!`);
  }

  try {
    const bugReportsMessage = await db.bugReportMessage.findMany({
      where: {
        bugReportId: bugReportId,
      },
      include: {
        bugReport: {
          include: {
            company: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        attachment: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return bugReportsMessage;
  } catch (error) {
    throw new Error(`Failed to get bug report message based on bug report`);
  }
}

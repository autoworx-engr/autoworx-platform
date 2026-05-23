"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export default async function getCompanyBugReportMessage({
  bugReportId,
}: {
  bugReportId: number;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isExistBugReport = await db.bugReport.findUnique({
    where: { id: +bugReportId },
    select: { companyId: true },
  });

  if (!isExistBugReport) {
    throw new Error(`Bug report not found!`);
  }

  if (!user.isSuperAdmin && +user.companyId !== isExistBugReport.companyId) {
    throw new Error(`Bug report not found based on your company!`);
  }

  try {
    const bugReportsMessage = await db.bugReportMessage.findMany({
      where: {
        bugReportId: +bugReportId,
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

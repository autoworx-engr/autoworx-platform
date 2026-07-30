"use server";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

type TReadMessageProps = {
  senderType: "company" | "super_admin";
  bugReportId: number;
};

export async function ReadMessage({
  senderType,
  bugReportId,
}: TReadMessageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    throw new Error("Invalid session. User not found.");
  }

  try {
    const report = await db.bugReport.findUnique({
      where: { id: +bugReportId },
      select: { companyId: true },
    });

    if (!report) {
      throw new Error("Bug report not found.");
    }

    if (!user.isSuperAdmin && +user.companyId !== report.companyId) {
      throw new Error("Forbidden.");
    }

    await db.bugReportMessage.updateMany({
      where: {
        bugReportId: +bugReportId,
        senderType: senderType,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return { type: "success" };
  } catch (error) {
    errorHandler(error);
  }
}

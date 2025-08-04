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

  if (!user?.companyId || !user) {
    throw new Error("Invalid session. Company or user not found.");
  }

  try {
    await db.bugReportMessage.updateMany({
      where: {
        bugReportId: +bugReportId,
        senderType: senderType,
        userId: +user?.id,
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

"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { revalidatePath } from "next/cache";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

export type AttachmentInput = {
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: string;
  messageId?: number;
  bugReportMessageId?: number;
};

type SuperAdminBugMessagePayload = {
  bugReportId: number;
  content: string;
  attachments?: AttachmentInput[];
  companyId: number;
};

export async function createBugReportMessageBySuperAdmin(
  data: SuperAdminBugMessagePayload,
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user?.isSuperAdmin) {
      throw new Error("Only super admins are allowed to perform this action.");
    }

    const existingReport = await db.bugReport.findUnique({
      where: { id: +data.bugReportId, companyId: +data.companyId },
    });

    if (!existingReport) {
      throw new Error("Bug report not found.");
    }

    const bugMessage = await db.bugReportMessage.create({
      data: {
        bugReportId: +data.bugReportId,
        subject: null,
        content: data.content,
        senderType: "super_admin",
        userId: +user.id,
        ...(data.attachments && data.attachments.length > 0
          ? {
              attachment: {
                create: data.attachments.map((file) => ({
                  fileName: file.fileName,
                  fileType: file.fileType,
                  fileUrl: file.fileUrl,
                  fileSize: `${(Number(file.fileSize) / 1024 / 1024).toPrecision(2)} MB`,
                })),
              },
            }
          : {}),
      },
    });

    revalidatePath(`/bug-report/${data.bugReportId}`);

    return { type: "success", data: bugMessage };
  } catch (error) {
    return errorHandler(error);
  }
}

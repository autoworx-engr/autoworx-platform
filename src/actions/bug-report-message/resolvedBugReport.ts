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
  isResolved: boolean;
};

export async function resolvedBugReport(
  data: SuperAdminBugMessagePayload,
): Promise<ServerAction | TErrorHandler> {
  try {
    const existingReport = await db.bugReport.findUnique({
      where: { id: data.bugReportId, isResolved: false },
    });

    if (!existingReport) {
      throw new Error("Bug report not found.");
    }

    await db.bugReport.update({
      where: {
        id: data.bugReportId,
      },
      data: {
        isResolved: data.isResolved,
      },
    });

    return { type: "success", data: null };
  } catch (error) {
    return errorHandler(error);
  }
}

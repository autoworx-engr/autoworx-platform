"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

type SuperAdminBugMessagePayload = {
  bugReportId: number;
  isResolved: boolean;
};

export async function resolvedBugReport(
  data: SuperAdminBugMessagePayload,
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      throw new Error("Only super admins are allowed to perform this action.");
    }

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

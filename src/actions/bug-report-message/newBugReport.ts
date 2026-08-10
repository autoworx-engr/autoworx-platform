"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { revalidatePath } from "next/cache";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { UserType } from "@prisma/client";
import { AttachmentInput } from "./createBugReportMessageBySuperAdmin";

type BugMessagePayload = {
  content: string;
  subject: string;
  senderType: UserType;
  attachments?: AttachmentInput[];
};

export async function createNewBugReportMessage(
  data: BugMessagePayload,
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.companyId;
    const userId = session?.user.id;

    if (!companyId || !userId) {
      throw new Error("Invalid session. Company or user not found.");
    }

    const company = await db.company.findUnique({
      where: { id: +companyId },
      select: { name: true },
    });

    if (!company) {
      throw new Error("Company not found.");
    }

    await db.$transaction(async (ts) => {
      const newReport = await ts.bugReport.create({
        data: {
          companyId,
          isResolved: false,
        },
      });

      // Create the message
      const bugMessage = await ts.bugReportMessage.create({
        data: {
          bugReportId: +newReport.id,
          subject: `[#BUG-${newReport.id}] ${company.name} - ${data.subject}`,
          content: data.content,
          senderType: data.senderType,
          userId: +userId,
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

      return bugMessage;
    });

    revalidatePath("/dashboard");

    return { type: "success" };
  } catch (error) {
    return errorHandler(error);
  }
}

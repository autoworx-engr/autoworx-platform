"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { EmailTemplateType } from "@prisma/client";
import { getServerSession } from "next-auth";
export async function addTemplate({
  subject,
  message,
  type,
}: {
  subject: string;
  message: string;
  type: EmailTemplateType;
}): Promise<ServerAction> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  const newTemplate = await db.emailTemplate.create({
    data: {
      subject,
      message,
      type,
      companyId,
    },
  });

  return {
    type: "success",
    data: newTemplate,
  };
}

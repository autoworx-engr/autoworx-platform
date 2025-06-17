"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import QRCode from "qrcode";

export async function createLeadLink({
  source,
  generatedLink,
  companyId,
}: {
  source: string;
  generatedLink: string;
  companyId: number;
}): Promise<ServerAction> {
  const existingLink = await db.leadLink.findFirst({
    where: {
      source,
      generatedLink,
      companyId,
    },
  });

  if (existingLink) {
    return {
      type: "error",
      message: "The lead link already exists",
    };
  }

  const qrDataURL = await QRCode.toDataURL(generatedLink);

  const leadLink = await db.leadLink.create({
    data: {
      source,
      generatedLink,
      QRCode: qrDataURL,
      companyId: companyId,
    },
  });

  return {
    type: "success",
    data: leadLink,
  };
}

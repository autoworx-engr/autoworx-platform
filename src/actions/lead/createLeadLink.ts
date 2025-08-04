"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import QRCode from "qrcode";

export async function createLeadLink({
  source,
  generatedLink,
  companyId,
  shortUrl,
}: {
  source: string;
  generatedLink: string;
  companyId: number;
  shortUrl: string;
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

  const qrDataURL = await QRCode.toDataURL(shortUrl);

  const leadLink = await db.leadLink.create({
    data: {
      source,
      generatedLink,
      shortUrl,
      QRCode: qrDataURL,
      companyId: companyId,
    },
  });

  return {
    type: "success",
    data: leadLink,
  };
}

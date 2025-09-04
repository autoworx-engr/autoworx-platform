"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import QRCode from "qrcode";

export async function createLeadLink({
  source,
  generatedLink,
  companyId,
  shortUrl,
  isShow,
}: {
  source: string;
  generatedLink: string;
  companyId: number;
  shortUrl: string;
  isShow: boolean;
}): Promise<ServerAction> {
  const existingLink = await db.leadLink.findFirst({
    where: {
      source: {
        contains: source,
      },
      generatedLink,
      companyId,
    },
  });

  if (existingLink) {
    if (!existingLink.isShow) {
      const updatedLink = await db.leadLink.update({
        where: { id: existingLink.id },
        data: { isShow },
      });
      return { type: "success", data: updatedLink };
    }

    return {
      type: "error",
      message: "The lead link already exists",
      data: existingLink,
    };
  }

  const qrDataURL = await QRCode.toDataURL(shortUrl);

  const newLeadLink = await db.leadLink.create({
    data: {
      source: source.toLowerCase(),
      generatedLink,
      shortUrl,
      QRCode: qrDataURL,
      companyId,
      isShow,
    },
  });

  return { type: "success", data: newLeadLink };
}

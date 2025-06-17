"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";

const getSms = async (
  clientId: number,
): Promise<(ClientSMS & { attachments: ClientSmsAttachments[] })[]> => {
  const companyId = await getCompanyId();

  return await db.clientSMS.findMany({
    where: {
      clientId: +clientId!,
      companyId,
    },
    include: {
      attachments: true,
    },
  });
};

export default getSms;

"use server";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";

const getSms = async (
  clientId: number,
  companyId?: number,
): Promise<(ClientSMS & { attachments: ClientSmsAttachments[] })[]> => {
  const cId = companyId || (await getCompanyId());

  const client = await db.client.findUnique({
    where: {
      id: clientId,
    },
    include: {
      Lead: true,
    },
  });

  const messages = await db.clientSMS.findMany({
    where: {
      clientId: +clientId!,
      companyId: cId,
    },
    include: {
      attachments: true,
    },
  });

  return messages;
};

export default getSms;

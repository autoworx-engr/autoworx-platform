"use server";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";

const getSms = async (
  clientId: number,
): Promise<(ClientSMS & { attachments: ClientSmsAttachments[] })[]> => {
  const companyId = await getCompanyId();

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
      companyId,
    },
    include: {
      attachments: true,
    },
  });

  return messages;
};

export default getSms;
